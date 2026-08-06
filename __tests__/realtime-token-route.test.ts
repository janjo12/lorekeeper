import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSupabaseAuthTokens: vi.fn(),
  setSupabaseAuthTokens: vi.fn(),
  refreshAuthSession: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
  getSupabaseAuthTokens: mocks.getSupabaseAuthTokens,
  setSupabaseAuthTokens: mocks.setSupabaseAuthTokens,
}));

vi.mock("@/app/dataloader", () => ({
  refreshAuthSession: mocks.refreshAuthSession,
}));

import { GET } from "../app/api/realtime-token/route";

describe("Realtime token renewal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    mocks.getSession.mockResolvedValue({ userId: "user-1" });
  });

  it("renews Realtime authentication from a refresh token after the access cookie expires", async () => {
    mocks.getSupabaseAuthTokens.mockResolvedValue({
      refreshToken: "still-valid-refresh",
    });
    mocks.refreshAuthSession.mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      accessToken: "new-access",
      url: "https://example.supabase.co",
      publishableKey: "publishable-key",
    });
    expect(mocks.refreshAuthSession).toHaveBeenCalledWith("still-valid-refresh");
    expect(mocks.setSupabaseAuthTokens).toHaveBeenCalledWith({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
  });

  it("still rejects requests without an application session or refresh token", async () => {
    mocks.getSupabaseAuthTokens.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.refreshAuthSession).not.toHaveBeenCalled();
  });
});
