import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260803040000_scope_categories_to_campaigns.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("campaign-scoped category schema", () => {
  it("replaces profile ownership with required campaign ownership", () => {
    expect(migration).toContain("add column campaign_id uuid references public.campaign(id) on delete cascade");
    expect(migration).toContain("drop column user_id");
    expect(migration).toContain("alter column campaign_id set not null");
    expect(migration).toContain("unique (campaign_id, name)");
  });

  it("prevents category trees and entities from crossing campaign boundaries", () => {
    expect(migration).toContain("foreign key (parent_category_id, campaign_id)");
    expect(migration).toContain("foreign key (category_id, campaign_id)");
  });

  it("loads and seeds categories by campaign", () => {
    expect(migration).toContain("category.campaign_id = c.id");
    expect(migration).toContain("insert into public.category(campaign_id, name)");
  });
});
