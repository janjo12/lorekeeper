import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync(new URL("../app/auth/actions.ts", import.meta.url), "utf8");

describe("authentication password validation", () => {
  it("applies password policy at creation but not at login", () => {
    expect(actions).toContain("password: z.string(),");
    expect(actions).toContain("password: passwordCreationSchema,");
    expect(actions).not.toContain("password: passwordSchema,");
  });
});
