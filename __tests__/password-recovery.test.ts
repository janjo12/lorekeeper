import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("password recovery", () => {
  const authForm = source("../app/auth/auth-form.tsx");
  const actions = source("../app/auth/actions.ts");
  const loader = source("../app/dataloader.js");
  const resetForm = source("../app/auth/reset-password/reset-password-form.tsx");

  it("links sign-in to an email recovery request", () => {
    expect(authForm).toContain('href="/auth/forgot-password"');
    expect(actions).toContain("export async function forgotPassword");
    expect(loader).toContain("auth.resetPasswordForEmail(email, { redirectTo })");
  });

  it("lets a recovery session choose and confirm a new password", () => {
    expect(resetForm).toContain("client.auth.updateUser({ password })");
    expect(resetForm).toContain('name="confirmPassword"');
    expect(resetForm).toContain("Passwords do not match.");
  });
});
