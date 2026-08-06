import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const migration = source("../supabase/migrations/20260806010000_add_entity_co_ownership.sql");
const view = source("../app/data/campaign-lore/entity-view.tsx");
const actions = source("../app/data/actions.ts");

describe("entity co-ownership", () => {
  it("stores accepted campaign players as entity co-owners without an invitation state", () => {
    expect(migration).toMatch(/create table public\.entity_co_owner[\s\S]*primary key \(entity_id, profile_id\)/);
    expect(migration).toContain("function public.set_entity_co_owners(");
    expect(migration).toContain("Every co-owner must already be a player in this campaign");
    expect(migration).not.toContain("pending_entity");
  });

  it("allows co-owners to manage content and reveals but not category or entity deletion", () => {
    expect(migration).toContain("function public.can_manage_entity_content(");
    expect(migration).toContain("Entity co-owners cannot change the category");
    expect(migration).toContain("public.can_manage_entity_content(requesting_user_id, requested_entity_id)");
    expect(view).toContain("const canManageContent = isGm || data.is_co_owner === true");
    expect(view).toContain("(data.co_owners ?? []).map");
    expect(view).toContain("{isGm && <ActionForm");
  });

  it("offers GM assignment and opt-in email notification controls", () => {
    expect(view).toContain(">Co-owners</summary>");
    expect(view).toContain('name="profileId"');
    expect(view).toContain('name="sendEmail" value="true"');
    expect(actions).toContain("await setEntityCoOwners(userId, entityId, profileIds)");
    expect(actions).toContain("sendNotificationEmail");
  });
});
