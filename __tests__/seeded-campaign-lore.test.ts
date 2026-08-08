import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260807010000_update_seeded_campaign_lore.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("starter campaign lore", () => {
  it("describes Lord Villenus as a Lich using the entity's spelling", () => {
    expect(migration).toContain(
      "(villain, 'Description', 'A powerful Lich who rules a vast territory.')",
    );
  });

  it("gives the Lich entity its instructional Stats textbox", () => {
    expect(migration).toContain(
      "(lich, 'Stats', 'You could put the play information for liches here, or maybe add an image to hold a statblock.')",
    );
  });
});
