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
    delete: vi.fn(() => query),
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
    process.env.AI_API_ENCRYPTION_SECRET = "test-ai-encryption-secret-at-least-32-characters";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("signs up a user and returns the profile created for that auth identity", async () => {
    const profile = { id: "user-1", username: "keeper", created_at: "2026-07-16" };
    const authClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-1" },
            session: { access_token: "access-1", refresh_token: "refresh-1" },
          },
          error: null,
        }),
      },
    };
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
    createClient.mockReturnValueOnce(database).mockReturnValueOnce(authClient);
    const { signupUser } = await loadDataloader();

    await expect(signupUser("keeper@example.com", "keeper", "long-password")).resolves.toEqual({
      ...profile,
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
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
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-2" },
            session: { access_token: "access-2", refresh_token: "refresh-2" },
          },
          error: null,
        }),
      },
    };
    createClient.mockReturnValueOnce(database).mockReturnValueOnce(authClient);
    const { loginUser } = await loadDataloader();

    await expect(loginUser("scribe@example.com", "long-password")).resolves.toEqual({
      ...profile,
      accessToken: "access-2",
      refreshToken: "refresh-2",
    });
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
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-2" },
            session: { access_token: "access-2", refresh_token: "refresh-2" },
          },
          error: null,
        }),
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

  it("refreshes the Supabase session used by Realtime", async () => {
    const authClient = {
      auth: {
        refreshSession: vi.fn().mockResolvedValue({
          data: {
            session: { access_token: "new-access", refresh_token: "new-refresh" },
          },
          error: null,
        }),
      },
    };
    createClient.mockReturnValue(authClient);
    const { refreshAuthSession } = await loadDataloader();

    await expect(refreshAuthSession("old-refresh")).resolves.toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    expect(authClient.auth.refreshSession).toHaveBeenCalledWith({
      refresh_token: "old-refresh",
    });
  });

  it("verifies the current password before changing it and returns a fresh session", async () => {
    const oldPasswordAuth = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-1" },
            session: { access_token: "verified-access", refresh_token: "verified-refresh" },
          },
          error: null,
        }),
      },
    };
    const database = {
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    };
    const newPasswordAuth = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-1" },
            session: { access_token: "new-access", refresh_token: "new-refresh" },
          },
          error: null,
        }),
      },
    };
    createClient
      .mockReturnValueOnce(oldPasswordAuth)
      .mockReturnValueOnce(database)
      .mockReturnValueOnce(newPasswordAuth);
    const { changeUserPassword } = await loadDataloader();

    await expect(
      changeUserPassword("user-1", "keeper@example.com", "old-password", "new-password"),
    ).resolves.toEqual({ accessToken: "new-access", refreshToken: "new-refresh" });
    expect(oldPasswordAuth.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "keeper@example.com",
      password: "old-password",
    });
    expect(database.auth.admin.updateUserById).toHaveBeenCalledWith("user-1", {
      password: "new-password",
    });
    expect(newPasswordAuth.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "keeper@example.com",
      password: "new-password",
    });
  });

  it("does not change a password when the verified Auth identity differs from the session", async () => {
    const authClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "different-user" },
            session: { access_token: "access", refresh_token: "refresh" },
          },
          error: null,
        }),
      },
    };
    createClient.mockReturnValue(authClient);
    const { changeUserPassword } = await loadDataloader();

    await expect(
      changeUserPassword("user-1", "keeper@example.com", "current-password", "new-password"),
    ).rejects.toThrow("did not match this account");
    expect(createClient).toHaveBeenCalledOnce();
  });

  it("resets only the user identified by a valid recovery access token", async () => {
    const recoveryAuth = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "recovered-user" } },
          error: null,
        }),
      },
    };
    const database = {
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    };
    createClient.mockReturnValueOnce(recoveryAuth).mockReturnValueOnce(database);
    const { completePasswordReset } = await loadDataloader();

    await expect(
      completePasswordReset("recovery-token", "reused-password"),
    ).resolves.toBeUndefined();
    expect(recoveryAuth.auth.getUser).toHaveBeenCalledWith("recovery-token");
    expect(database.auth.admin.updateUserById).toHaveBeenCalledWith("recovered-user", {
      password: "reused-password",
    });
  });

  it("deletes an authenticated account and its owned image files", async () => {
    const authClient = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-1" },
            session: { access_token: "access", refresh_token: "refresh" },
          },
          error: null,
        }),
      },
    };
    const campaignsQuery = queryReturning({ data: [{ id: "campaign-1" }], error: null });
    const entitiesQuery = queryReturning({ data: [{ id: "entity-1" }], error: null });
    const imagesQuery = queryReturning({
      data: [{ storage_path: "user-1/entity-1/image.png" }],
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const database = {
      auth: { admin: { deleteUser } },
      from: vi
        .fn()
        .mockReturnValueOnce(campaignsQuery)
        .mockReturnValueOnce(entitiesQuery)
        .mockReturnValueOnce(imagesQuery),
      storage: { from: vi.fn(() => ({ remove })) },
    };
    createClient.mockReturnValueOnce(authClient).mockReturnValueOnce(database);
    const { deleteUserAccount } = await loadDataloader();

    await deleteUserAccount("user-1", "keeper@example.com", "current-password");

    expect(deleteUser).toHaveBeenCalledWith("user-1");
    expect(remove).toHaveBeenCalledWith(["user-1/entity-1/image.png"]);
  });

  it("removes campaign image files after the database cascade", async () => {
    const campaignsQuery = queryReturning({ data: [{ id: "campaign-1" }], error: null });
    const entitiesQuery = queryReturning({ data: [{ id: "entity-1" }], error: null });
    const imagesQuery = queryReturning({
      data: [{ storage_path: "gm/entity-1/map.png" }],
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    createClient.mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce(campaignsQuery)
        .mockReturnValueOnce(entitiesQuery)
        .mockReturnValueOnce(imagesQuery),
      rpc,
      storage: { from: vi.fn(() => ({ remove })) },
    });
    const { deleteCampaign } = await loadDataloader();

    await deleteCampaign("gm", "campaign-1");

    expect(rpc).toHaveBeenCalledWith("delete_campaign", {
      requesting_user_id: "gm",
      requested_campaign_id: "campaign-1",
    });
    expect(remove).toHaveBeenCalledWith(["gm/entity-1/map.png"]);
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

  it("recreates the database client when server credentials change", async () => {
    const firstDatabase = { from: vi.fn(() => queryReturning({ data: null, error: null })) };
    const secondDatabase = { from: vi.fn(() => queryReturning({ data: null, error: null })) };
    createClient.mockReturnValueOnce(firstDatabase).mockReturnValueOnce(secondDatabase);
    const { getUserPreferences } = await loadDataloader();

    await getUserPreferences("first-user");
    process.env.SUPABASE_SECRET_KEY = "rotated-secret-key";
    await getUserPreferences("second-user");

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

  it("loads the visibility-filtered lightweight campaign index in one call", async () => {
    const lore = {
      campaign: { id: "campaign-1", user_id: "gm-1" },
      categories: [],
      entities: [],
    };
    const rpc = vi.fn().mockResolvedValue({ data: lore, error: null });
    const database = { rpc, from: vi.fn() };
    createClient.mockReturnValue(database);
    const { getCampaignLore } = await loadDataloader();

    await expect(getCampaignLore("campaign-1", "player-1")).resolves.toEqual(lore);
    expect(rpc).toHaveBeenCalledOnce();
    expect(database.from).not.toHaveBeenCalled();
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

  it("creates and resolves campaign invitations with protected RPC calls", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    createClient.mockReturnValue({ rpc });
    const { acceptPendingCampaignInvite, addPendingCampaignInvite, removePendingCampaignInvite } =
      await loadDataloader();

    await addPendingCampaignInvite("gm-1", "campaign-1", "player_name");
    expect(rpc).toHaveBeenCalledWith("add_pending_campaign_invite", {
      requesting_user_id: "gm-1",
      requested_campaign_id: "campaign-1",
      invited_username: "player_name",
    });

    await removePendingCampaignInvite("player-1", "campaign-1");
    expect(rpc).toHaveBeenCalledWith("remove_pending_campaign_invite", {
      requesting_user_id: "player-1",
      requested_campaign_id: "campaign-1",
    });

    await acceptPendingCampaignInvite("player-1", "campaign-1");
    expect(rpc).toHaveBeenCalledWith("accept_campaign_invite", {
      requesting_user_id: "player-1",
      requested_campaign_id: "campaign-1",
    });
    expect(rpc).toHaveBeenCalledTimes(3);
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

  it("adds player content reveals with one protected RPC call", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    createClient.mockReturnValue({ rpc });
    const { addEntityContentReveals } = await loadDataloader();

    await addEntityContentReveals("player-1", "textbox-1", "textbox", false, ["player-2"]);

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("reveal_entity_content_to_players", {
      requesting_user_id: "player-1",
      requested_content_id: "textbox-1",
      content_type: "textbox",
      reveal_to_all: false,
      revealed_profile_ids: ["player-2"],
    });
  });

  it("loads entities for a selected user tag with one protected RPC call", async () => {
    const entities = [
      {
        id: "entity-1",
        name: "The Archive",
        campaign_id: "campaign-1",
        campaign_name: "Aster",
      },
    ];
    const rpc = vi.fn().mockResolvedValue({ data: entities, error: null });
    createClient.mockReturnValue({ rpc });
    const { getTaggedEntitiesForUser } = await loadDataloader();

    await expect(getTaggedEntitiesForUser("gm-1", "tag-1")).resolves.toEqual(entities);
    expect(rpc).toHaveBeenCalledWith("get_tagged_entities_for_user", {
      requesting_user_id: "gm-1",
      requested_tag_id: "tag-1",
    });
  });

  it("creates categories inside an owned campaign", async () => {
    const campaignQuery = queryReturning({ data: { id: "campaign-1" }, error: null });
    const categoryQuery = queryReturning({
      data: { id: "category-1", name: "People", parent_category_id: null },
      error: null,
    });
    const database = {
      from: vi.fn().mockReturnValueOnce(campaignQuery).mockReturnValueOnce(categoryQuery),
    };
    createClient.mockReturnValue(database);
    const { createCategory } = await loadDataloader();

    await createCategory("campaign-1", "gm-1", "People", null);

    expect(campaignQuery.eq).toHaveBeenCalledWith("id", "campaign-1");
    expect(campaignQuery.eq).toHaveBeenCalledWith("user_id", "gm-1");
    expect(categoryQuery.insert).toHaveBeenCalledWith({
      campaign_id: "campaign-1",
      name: "People",
      parent_category_id: null,
    });
  });

  it("moves an owned entity to another owned category", async () => {
    const entityQuery = queryReturning({
      data: { id: "entity-1", campaign_id: "campaign-1", campaign: { user_id: "gm-1" } },
      error: null,
    });
    const destinationQuery = queryReturning({
      data: { id: "category-2", parent_category_id: null, campaign_id: "campaign-1" },
      error: null,
    });
    const updateQuery = queryReturning({ data: null, error: null });
    const database = {
      from: vi
        .fn()
        .mockReturnValueOnce(entityQuery)
        .mockReturnValueOnce(destinationQuery)
        .mockReturnValueOnce(updateQuery),
    };
    createClient.mockReturnValue(database);
    const { moveEntity } = await loadDataloader();

    await moveEntity("gm-1", "entity-1", "category-2");

    expect(updateQuery.update).toHaveBeenCalledWith({ category_id: "category-2" });
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "entity-1");
    expect(destinationQuery.eq).toHaveBeenCalledWith("campaign_id", "campaign-1");
  });

  it("moves a category to the top level", async () => {
    const sourceQuery = queryReturning({
      data: { id: "category-1", parent_category_id: "old-parent", campaign_id: "campaign-1" },
      error: null,
    });
    const updateQuery = queryReturning({ data: null, error: null });
    createClient.mockReturnValue({
      from: vi.fn().mockReturnValueOnce(sourceQuery).mockReturnValueOnce(updateQuery),
    });
    const { moveCategory } = await loadDataloader();

    await moveCategory("gm-1", "category-1", null);

    expect(updateQuery.update).toHaveBeenCalledWith({ parent_category_id: null });
    expect(updateQuery.eq).toHaveBeenCalledWith("campaign_id", "campaign-1");
  });

  it("exposes entity content deletion as explicit textbox and image operations", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: "gm/entity/image.png", error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    createClient.mockReturnValue({
      rpc,
      storage: { from: vi.fn(() => ({ remove })) },
    });
    const { deleteEntityContent } = await loadDataloader();

    await deleteEntityContent("gm-1", "textbox-1", "textbox");
    await deleteEntityContent("gm-1", "image-1", "image");

    expect(rpc).toHaveBeenNthCalledWith(1, "delete_entity_content", {
      requesting_user_id: "gm-1",
      requested_content_id: "textbox-1",
      content_type: "textbox",
    });
    expect(remove).toHaveBeenCalledWith(["gm/entity/image.png"]);
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

  it("encrypts AI API keys before storing them and can decrypt an owned key for future tasks", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "api-1", error: null });
    const database = { rpc, from: vi.fn() };
    createClient.mockReturnValue(database);
    const { createAiApiForUser, getAiApiCredentialForTask } = await loadDataloader();

    await createAiApiForUser("user-1", {
      name: "Primary OpenAI",
      provider: "OpenAI",
      baseUrl: "",
      apiKey: "sk-super-secret-1234",
      makeDefault: false,
    });

    const stored = rpc.mock.calls[0][1].encrypted_key;
    expect(stored).not.toContain("sk-super-secret-1234");
    expect(stored).toMatch(/^v1\./);
    expect(rpc).toHaveBeenCalledWith(
      "create_profile_ai_api",
      expect.objectContaining({
        requesting_user_id: "user-1",
        key_suffix: "1234",
        make_default: false,
      }),
    );

    database.from.mockReturnValue(
      queryReturning({
        data: {
          id: "api-1",
          name: "Primary OpenAI",
          provider: "OpenAI",
          base_url: null,
          encrypted_api_key: stored,
        },
        error: null,
      }),
    );
    await expect(getAiApiCredentialForTask("user-1", "api-1")).resolves.toMatchObject({
      id: "api-1",
      apiKey: "sk-super-secret-1234",
    });
  });

  it("lists only masked AI API metadata for the profile page", async () => {
    const api = {
      id: "api-1",
      name: "Claude",
      provider: "Anthropic",
      key_last_four: "abcd",
      is_default: true,
    };
    const query = queryReturning({ data: [api], error: null });
    createClient.mockReturnValue({ from: vi.fn(() => query) });
    const { getAiApisForUser } = await loadDataloader();

    await expect(getAiApisForUser("user-1")).resolves.toEqual([api]);
    expect(query.select).toHaveBeenCalledWith(
      "id, name, provider, base_url, key_last_four, is_default, created_at",
    );
    expect(query.eq).toHaveBeenCalledWith("profile_id", "user-1");
  });

  it("surfaces database failures with their code and operation context", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "duplicate value", code: "23505" },
    });
    createClient.mockReturnValue({ rpc });
    const { createCampaign } = await loadDataloader();

    await expect(createCampaign("user-1", "Repeated")).rejects.toMatchObject({
      message: "Could not create campaign: duplicate value",
      code: "23505",
    });
    expect(rpc).toHaveBeenCalledWith("create_seeded_campaign", {
      requesting_user_id: "user-1",
      campaign_name: "Repeated",
    });
  });

  it("still creates a campaign when the seeded-campaign migration is not deployed", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message:
          "Could not find the function public.create_seeded_campaign(campaign_name, requesting_user_id) in the schema cache",
      },
    });
    const insertedCampaign = { id: "campaign-1", name: "Fresh World", user_id: "user-1" };
    const insertQuery = queryReturning({ data: insertedCampaign, error: null });
    const database = { rpc, from: vi.fn(() => insertQuery) };
    createClient.mockReturnValue(database);
    const { createCampaign } = await loadDataloader();

    await expect(createCampaign("user-1", "Fresh World")).resolves.toEqual(insertedCampaign);
    expect(database.from).toHaveBeenCalledWith("campaign");
    expect(insertQuery.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "Fresh World",
    });
    expect(insertQuery.select).toHaveBeenCalledWith("id, name, user_id");
    expect(insertQuery.single).toHaveBeenCalledOnce();
  });
});
