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
