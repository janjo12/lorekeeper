import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
const { updateThemeSetting } = vi.hoisted(() => ({ updateThemeSetting: vi.fn() }));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/app/dataloader", () => ({ updateThemeSetting }));

async function loadRoute() {
  return import("../app/api/theme/route.ts");
}

async function parseResponse(response: Response) {
  return response.json();
}

describe("PATCH /api/theme", () => {
  beforeEach(() => {
    vi.resetModules();
    getSession.mockReset();
    updateThemeSetting.mockReset();
  });

  it("updates the current user's theme", async () => {
    getSession.mockResolvedValue({ userId: "user-1", email: "keeper@example.com", username: "keeper" });
    updateThemeSetting.mockResolvedValue(undefined);
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      new Request("http://localhost/api/theme", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme: "sage" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(parseResponse(response)).resolves.toEqual({ theme: "sage" });
    expect(updateThemeSetting).toHaveBeenCalledWith("user-1", "sage");
  });

  it("rejects requests without a session", async () => {
    getSession.mockResolvedValue(null);
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      new Request("http://localhost/api/theme", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme: "sage" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(parseResponse(response)).resolves.toEqual({
      error: { message: "Sign in again to update your theme." },
    });
    expect(updateThemeSetting).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON bodies", async () => {
    getSession.mockResolvedValue({ userId: "user-1", email: "keeper@example.com", username: "keeper" });
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      new Request("http://localhost/api/theme", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "not-json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(parseResponse(response)).resolves.toEqual({
      error: { message: "Request body must be valid JSON." },
    });
    expect(updateThemeSetting).not.toHaveBeenCalled();
  });

  it("rejects unsupported theme ids", async () => {
    getSession.mockResolvedValue({ userId: "user-1", email: "keeper@example.com", username: "keeper" });
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      new Request("http://localhost/api/theme", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme: "chartreuse" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(parseResponse(response)).resolves.toEqual({
      error: { message: "Choose one of the supported themes." },
    });
    expect(updateThemeSetting).not.toHaveBeenCalled();
  });

  it("returns a generic error when persistence fails", async () => {
    getSession.mockResolvedValue({ userId: "user-1", email: "keeper@example.com", username: "keeper" });
    updateThemeSetting.mockRejectedValue(new Error("database exploded"));
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      new Request("http://localhost/api/theme", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme: "ink" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(parseResponse(response)).resolves.toEqual({
      error: { message: "Could not update theme right now." },
    });
  });
});