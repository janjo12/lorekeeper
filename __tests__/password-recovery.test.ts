import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("password recovery", () => {
  const authForm = source("../app/auth/auth-form.tsx");
  const actions = source("../app/auth/actions.ts");
  const loader = source("../app/dataloader.js");
  const resetForm = source("../app/auth/reset-password/reset-password-form.tsx");
  const resetCard = source("../app/auth/reset-password/reset-password-card.tsx");
  const resetRoute = source("../app/api/password-recovery/route.ts");

  it("links sign-in to an email recovery request", () => {
    expect(authForm).toContain('href="/auth/forgot-password"');
    expect(actions).toContain("export async function forgotPassword");
    expect(loader).toContain("auth.resetPasswordForEmail(email, { redirectTo })");
  });

  it("lets a recovery session choose and confirm a new password", () => {
    expect(resetForm).toContain('event === "PASSWORD_RECOVERY"');
    expect(resetForm).toContain('recoveryState === "verifying"');
    expect(resetForm).toContain('fetch("/api/password-recovery"');
    expect(resetRoute).toContain("completePasswordReset(accessToken");
    expect(resetForm).toContain('name="confirmPassword"');
    expect(resetForm).toContain("Passwords do not match.");
    expect(resetForm).toContain('href="/auth/forgot-password"');
    expect(resetForm).toContain("<PasswordInput");
    expect(resetForm).toContain("onSuccess();");
    expect(resetCard).toContain('title="Your password has been updated."');
    expect(resetCard).toContain("if (complete)");
  });

  it("reports resend throttling without exposing whether an account exists", () => {
    expect(actions).toContain("A reset email was requested recently.");
    expect(actions).toContain("The email service has reached its sending limit.");
    expect(actions).toContain('code === "over_email_send_rate_limit"');
    expect(actions).toContain("If that email belongs to an account");
  });
});
