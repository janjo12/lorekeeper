import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manager = readFileSync(new URL("../app/data/profile/ai-api-manager.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260803020000_add_profile_ai_apis.sql", import.meta.url), "utf8");

describe("profile AI API management", () => {
  it("provides add, default, masked-list, and remove controls on the profile", () => {
    expect(manager).toContain("Your first API automatically becomes the default.");
    expect(manager).toContain("Key ending in {api.key_last_four}");
    expect(manager).toContain("Make default");
    expect(manager).toContain("removeAiApi");
    expect(manager).toContain('type="password"');
  });

  it("keeps exactly one transactional default and scopes mutations to the requesting profile", () => {
    expect(migration).toContain("profile_ai_api_one_default");
    expect(migration).toContain("for update");
    expect(migration).toContain("profile_id = requesting_user_id");
    expect(migration).toContain("revoke all on table public.profile_ai_api from public, anon, authenticated");
  });
});
