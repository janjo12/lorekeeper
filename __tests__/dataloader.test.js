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
    order: vi.fn(() => query),
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
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1", created_at: "2026-07-16" } },
            error: null,
          }),
        },
      },
    };
    createClient.mockReturnValue(database);
    const { signupUser } = await loadDataloader();

    await expect(signupUser("keeper@example.com", "keeper", "long-password")).resolves.toEqual(
      profile,
    );
    expect(database.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "keeper@example.com",
        email_confirm: true,
        user_metadata: { username: "keeper" },
      }),
    );
  });

  it("logs in valid credentials and returns the matching public profile", async () => {
    const profile = { id: "user-2", username: "scribe", created_at: "2026-07-16" };
    const database = { from: vi.fn(() => queryReturning({ data: profile, error: null })) };
    const authClient = {
      auth: {
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-2" } }, error: null }),
      },
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
      auth: {
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-2" } }, error: null }),
      },
    };
    createClient.mockReturnValueOnce(database).mockReturnValueOnce(authClient);
    const { loginUser } = await loadDataloader();

    await loginUser("scribe@example.com", "long-password");

    expect(createClient).toHaveBeenNthCalledWith(
      2,
      "https://example.supabase.co",
      "publishable-key",
      expect.any(Object),
    );
  });

  it("surfaces a duplicate email instead of replacing its profile", async () => {
    const database = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "already registered", code: "email_exists" },
          }),
        },
      },
    };
    createClient.mockReturnValue(database);
    const { signupUser } = await loadDataloader();

    await expect(signupUser("keeper@example.com", "keeper", "long-password")).rejects.toMatchObject(
      { code: "email_exists" },
    );
  });

  it("returns null when a profile does not exist", async () => {
    createClient.mockReturnValue({
      from: vi.fn(() => queryReturning({ data: null, error: null })),
    });
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
    const dashboard = {
      owned: [{ id: "campaign-1", players: [] }],
      joined: [{ id: "campaign-2" }],
    };
    const rpc = vi.fn().mockResolvedValue({ data: dashboard, error: null });
    createClient.mockReturnValue({ rpc });
    const { getCampaignDashboard } = await loadDataloader();

    await expect(getCampaignDashboard("user-1")).resolves.toEqual(dashboard);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("get_campaign_dashboard", { requesting_user_id: "user-1" });
  });

  it("loads campaign categories from the campaign owner's category tree", async () => {
    const lore = {
      campaign: { id: "campaign-1", user_id: "gm-1" },
      categories: [],
      entities: [],
    };
    const categories = [{ id: "category-1", name: "People", parent_category_id: null }];
    const rpc = vi.fn().mockResolvedValue({ data: lore, error: null });
    const categoryQuery = queryReturning({ data: categories, error: null });
    const database = { rpc, from: vi.fn(() => categoryQuery) };
    createClient.mockReturnValue(database);
    const { getCampaignLore } = await loadDataloader();

    await expect(getCampaignLore("campaign-1", "player-1")).resolves.toEqual({
      ...lore,
      categories,
    });
    expect(categoryQuery.eq).toHaveBeenCalledWith("user_id", "gm-1");
  });

  it("can load reveal visibility without generating image URLs", async () => {
    const view = { entity: { id: "entity-1" }, images: [{ storage_path: "image.png" }] };
    const storageFrom = vi.fn();
    createClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: view, error: null }),
      storage: { from: storageFrom },
    });
    const { getEntityView } = await loadDataloader();

    await expect(getEntityView("entity-1", "player-1", { signImages: false })).resolves.toEqual(
      view,
    );
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it("adds signed URLs to private entity images", async () => {
    const view = { entity: { id: "entity-1" }, images: [{ storage_path: "gm/entity/image.png" }] };
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [{ signedUrl: "https://example.supabase.co/signed/image.png" }],
      error: null,
    });
    createClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: view, error: null }),
      storage: { from: vi.fn(() => ({ createSignedUrls })) },
    });
    const { getEntityView } = await loadDataloader();

    await expect(getEntityView("entity-1", "player-1")).resolves.toMatchObject({
      images: [{ signed_url: "https://example.supabase.co/signed/image.png" }],
    });
    expect(createSignedUrls).toHaveBeenCalledWith(["gm/entity/image.png"], 600);
  });

  it("uploads an entity image and stores only its private object metadata", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const storageFrom = vi.fn(() => ({ upload }));
    createClient.mockReturnValue({ rpc, storage: { from: storageFrom } });
    const { addEntityImage } = await loadDataloader();
    const file = { name: "Map Final.PNG", type: "image/png", size: 2048 };

    await addEntityImage("gm-1", "entity-1", "World Map", file);

    const storagePath = upload.mock.calls[0][0];
    expect(storagePath).toMatch(/^gm-1\/entity-1\/[0-9a-f-]+\.png$/);
    expect(upload).toHaveBeenCalledWith(storagePath, file, {
      contentType: "image/png",
      upsert: false,
    });
    expect(rpc).toHaveBeenCalledWith("add_entity_image", {
      requesting_user_id: "gm-1",
      requested_entity_id: "entity-1",
      image_name: "World Map",
      requested_storage_path: storagePath,
      requested_mime_type: "image/png",
      requested_file_size: 2048,
      requested_original_filename: "Map Final.PNG",
    });
  });

  it("removes a newly uploaded object when its metadata insert fails", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Entity access denied", code: "42501" },
    });
    createClient.mockReturnValue({
      rpc,
      storage: { from: vi.fn(() => ({ upload, remove })) },
    });
    const { addEntityImage } = await loadDataloader();

    await expect(
      addEntityImage("player-1", "entity-1", "Forbidden", {
        name: "forbidden.png",
        type: "image/png",
        size: 100,
      }),
    ).rejects.toThrow("Could not add image: Entity access denied");
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
  });

  it("adds a campaign player with one protected RPC call", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    createClient.mockReturnValue({ rpc });
    const { addCampaignPlayer } = await loadDataloader();

    await addCampaignPlayer("gm-1", "campaign-1", "player_name");
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("add_campaign_player", {
      requesting_user_id: "gm-1",
      requested_campaign_id: "campaign-1",
      player_username: "player_name",
    });
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
    const database = {
      from: vi.fn().mockReturnValueOnce(readQuery).mockReturnValueOnce(updateQuery),
    };
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
      from: vi.fn(() =>
        queryReturning({ data: null, error: { message: "duplicate value", code: "23505" } }),
      ),
    });
    const { createCampaign } = await loadDataloader();

    await expect(createCampaign("user-1", "Repeated")).rejects.toMatchObject({
      message: "Could not create campaign: duplicate value",
      code: "23505",
    });
  });
});
