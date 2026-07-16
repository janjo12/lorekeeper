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
  });

  it("signs up a user and returns the profile created for that auth identity", async () => {
    const profile = { id: "user-1", username: "keeper", created_at: "2026-07-16" };
    const database = {
      auth: { admin: { createUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) } },
      from: vi.fn(() => queryReturning({ data: profile, error: null })),
    };
    createClient.mockReturnValue(database);
    const { signupUser } = await loadDataloader();

    await expect(signupUser("keeper", "long-password")).resolves.toEqual(profile);
  });

  it("logs in valid credentials and returns the matching public profile", async () => {
    const profile = { id: "user-2", username: "scribe", created_at: "2026-07-16" };
    const database = { from: vi.fn(() => queryReturning({ data: profile, error: null })) };
    const authClient = {
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "user-2" } }, error: null }) },
    };
    createClient.mockReturnValueOnce(database).mockReturnValueOnce(authClient);
    const { loginUser } = await loadDataloader();

    await expect(loginUser("scribe", "long-password")).resolves.toEqual(profile);
  });

  it("repairs a missing profile when signup is retried for the same credentials", async () => {
    const profile = { id: "user-1", username: "keeper", created_at: "2026-07-16" };
    const database = {
      auth: { admin: { createUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "already registered", code: "email_exists" },
      }) } },
      from: vi.fn(() => queryReturning({ data: profile, error: null })),
    };
    const authClient = {
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
    };
    createClient.mockReturnValueOnce(database).mockReturnValueOnce(authClient);
    const { signupUser } = await loadDataloader();

    await expect(signupUser("keeper", "long-password")).resolves.toEqual(profile);
  });

  it("returns null when a profile does not exist", async () => {
    createClient.mockReturnValue({ from: vi.fn(() => queryReturning({ data: null, error: null })) });
    const { getUserById } = await loadDataloader();

    await expect(getUserById("missing-user")).resolves.toBeNull();
  });

  it("combines owned and joined campaigns without duplicates", async () => {
    const owned = { id: "campaign-1", name: "Owned", user_id: "user-1" };
    const joined = { id: "campaign-2", name: "Joined", user_id: "user-2" };
    const results = [
      { data: [owned], error: null },
      { data: [{ campaign_id: "campaign-1" }, { campaign_id: "campaign-2" }], error: null },
      { data: [owned, joined], error: null },
    ];
    createClient.mockReturnValue({ from: vi.fn(() => queryReturning(results.shift())) });
    const { getCampaignsForUser } = await loadDataloader();

    await expect(getCampaignsForUser("user-1")).resolves.toEqual([owned, joined]);
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
