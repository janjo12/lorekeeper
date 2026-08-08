import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../app/data/profile/page.tsx", import.meta.url), "utf8");
const form = readFileSync(
  new URL("../app/data/profile/password-form.tsx", import.meta.url),
  "utf8",
);
const actions = readFileSync(
  new URL("../app/data/profile/actions.ts", import.meta.url),
  "utf8",
);

describe("profile password management", () => {
  it("places a password-change form on the signed-in profile page", () => {
    expect(page).toContain("<PasswordForm />");
    expect(form).toContain('autoComplete="current-password"');
    expect(form.match(/type="password"/g)).toHaveLength(3);
    expect(form).toContain("Update password");
  });

  it("validates confirmation and verifies the current password on the server", () => {
    expect(actions).toContain("Passwords do not match.");
    expect(actions).toContain("changeUserPassword(");
    expect(actions).toContain("Your current password is incorrect.");
    expect(actions).toContain("await createSession(session, tokens)");
    expect(actions).not.toContain("different from your current password");
  });
});
