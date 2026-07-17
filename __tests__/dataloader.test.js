import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

function queryReturning(result) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    upsert: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

async function loadDataloader() {
  return import("../app/dataloader.js");
}

describe("dataloader", () => {
  beforeEach(() => {
    vi.resetModules();
    createClient.mockReset();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "test-secret-key";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("signs up a user and returns the profile created for that auth identity", async () => {
    const profile = { id: "user-1", username: "keeper", created_at: "2026-07-16" };
    const database = {
      auth: { admin: { createUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", created_at: "2026-07-16" } }, error: null }) } },
    };
    createClient.mockReturnValue(database);
    const { signupUser } = await loadDataloader();

    await expect(signupUser("keeper@example.com", "keeper", "long-password")).resolves.toEqual(profile);
    expect(database.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "keeper@example.com",
      email_confirm: true,
      user_metadata: { username: "keeper" },
    }));
  });

  it("logs in valid credentials and returns the matching public profile", async () => {
    const profile = { id: "user-2", username: "scribe", created_at: "2026-07-16" };
    const database = { from: vi.fn(() => queryReturning({ data: profile, error: null })) };
    const authClient = {
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } }, error: null }) },
    };
    createClient.mockReturnValueOnce(database).mockReturnValueOnce(authClient);
    const { loginUser } = await loadDataloader();

    await expect(loginUser("scribe@example.com", "long-password")).resolves.toEqual(profile);
    expect(authClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "scribe@example.com",
      password: "long-password",
    });
  });

  it("uses a publishable key for password authentication when one is configured", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    const profile = { id: "user-2", username: "scribe", created_at: "2026-07-16" };
    const database = { from: vi.fn(() => queryReturning({ data: profile, error: null })) };
    const authClient = {
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } }, error: null }) },
    };
    createClient.mockReturnValueOnce(database).mockReturnValueOnce(authClient);
    const { loginUser } = await loadDataloader();

    await loginUser("scribe@example.com", "long-password");

    expect(createClient).toHaveBeenNthCalledWith(2, "https://example.supabase.co", "publishable-key", expect.any(Object));
  });

  it("surfaces a duplicate email instead of replacing its profile", async () => {
    const database = {
      auth: { admin: { createUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "already registered", code: "email_exists" },
      }) } },
    };
    createClient.mockReturnValue(database);
    const { signupUser } = await loadDataloader();

    await expect(signupUser("keeper@example.com", "keeper", "long-password")).rejects.toMatchObject({ code: "email_exists" });
  });

  it("returns null when a profile does not exist", async () => {
    createClient.mockReturnValue({ from: vi.fn(() => queryReturning({ data: null, error: null })) });
    const { getUserById } = await loadDataloader();

    await expect(getUserById("missing-user")).resolves.toBeNull();
  });

  it("recreates the database client when server credentials change", async () => {
    const firstDatabase = { from: vi.fn(() => queryReturning({ data: null, error: null })) };
    const secondDatabase = { from: vi.fn(() => queryReturning({ data: null, error: null })) };
    createClient.mockReturnValueOnce(firstDatabase).mockReturnValueOnce(secondDatabase);
    const { getUserById } = await loadDataloader();

    await getUserById("first-user");
    process.env.SUPABASE_SECRET_KEY = "rotated-secret-key";
    await getUserById("second-user");

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(firstDatabase.from).toHaveBeenCalledTimes(1);
    expect(secondDatabase.from).toHaveBeenCalledTimes(1);
  });

  it("loads owned and joined campaigns in one database call", async () => {
    const owned = { id: "campaign-1", name: "Owned", user_id: "user-1" };
    const joined = { id: "campaign-2", name: "Joined", user_id: "user-2" };
    const rpc = vi.fn().mockResolvedValue({ data: [owned, joined], error: null });
    createClient.mockReturnValue({ rpc });
    const { getCampaignsForUser } = await loadDataloader();

    await expect(getCampaignsForUser("user-1")).resolves.toEqual([owned, joined]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_accessible_campaigns", { requesting_user_id: "user-1" });
  });

  it("loads the GM and player campaign dashboard in one database call", async () => {
    const dashboard = { owned: [{ id: "campaign-1", players: [] }], joined: [{ id: "campaign-2" }] };
    const rpc = vi.fn().mockResolvedValue({ data: dashboard, error: null });
    createClient.mockReturnValue({ rpc });
    const { getCampaignDashboard } = await loadDataloader();

    await expect(getCampaignDashboard("user-1")).resolves.toEqual(dashboard);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("get_campaign_dashboard", { requesting_user_id: "user-1" });
  });

  it("adds a campaign player with one protected RPC call", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    createClient.mockReturnValue({ rpc });
    const { addCampaignPlayer } = await loadDataloader();

    await addCampaignPlayer("gm-1", "campaign-1", "player_name");
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("add_campaign_player", { requesting_user_id: "gm-1", requested_campaign_id: "campaign-1", player_username: "player_name" });
  });

  it("sets selected-player content reveals with one protected RPC call", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    createClient.mockReturnValue({ rpc });
    const { setEntityContentReveal } = await loadDataloader();

    await setEntityContentReveal("gm-1", "textbox-1", "textbox", false, ["player-1"]);

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("set_entity_content_reveal", {
      requesting_user_id: "gm-1",
      requested_content_id: "textbox-1",
      content_type: "textbox",
      reveal_to_all: false,
      revealed_profile_ids: ["player-1"],
    });
  });

  it("loads and updates account-scoped theme preferences", async () => {
    const preferences = { last_campaign_id: "campaign-1", theme_setting: "midnight" };
    const readQuery = queryReturning({ data: preferences, error: null });
    const updateQuery = queryReturning({ data: null, error: null });
    const database = { from: vi.fn().mockReturnValueOnce(readQuery).mockReturnValueOnce(updateQuery) };
    createClient.mockReturnValue(database);
    const { getUserPreferences, updateThemeSetting } = await loadDataloader();

    await expect(getUserPreferences("user-1")).resolves.toEqual(preferences);
    await updateThemeSetting("user-1", "ember");

    expect(readQuery.select).toHaveBeenCalledWith("last_campaign_id, theme_setting");
    expect(updateQuery.update).toHaveBeenCalledWith({ theme_setting: "ember" });
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("surfaces database failures with their code and operation context", async () => {
    createClient.mockReturnValue({
      from: vi.fn(() => queryReturning({ data: null, error: { message: "duplicate value", code: "23505" } })),
    });
    const { createCampaign } = await loadDataloader();

    await expect(createCampaign("user-1", "Repeated")).rejects.toMatchObject({
      message: "Could not create campaign: duplicate value",
      code: "23505",
    });
  });
});
