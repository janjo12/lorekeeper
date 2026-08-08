import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contentControls = readFileSync(
  new URL("../app/data/campaign-lore/entity-content-controls.tsx", import.meta.url),
  "utf8",
);
const sideCategories = readFileSync(
  new URL("../app/data/campaign-lore/side-categories.tsx", import.meta.url),
  "utf8",
);
const lorePage = readFileSync(
  new URL("../app/data/campaign-lore/page.tsx", import.meta.url),
  "utf8",
);

describe("lore content controls", () => {
  it("shows GM campaign management above the all-lore link", () => {
    expect(sideCategories.indexOf("manage-campaign-link")).toBeLessThan(
      sideCategories.indexOf("All lore"),
    );
    expect(sideCategories).toContain("/data/campaigns/${campaignId}");
    expect(sideCategories).toContain("{isGm && (");
  });

  it("places reveal status beside content names and leaves edit/delete in content actions", () => {
    expect(contentControls).toContain("function ContentVisibilityHeading");
    expect(contentControls).toContain("<RevealIcon revealed={isRevealed} />");
    expect(contentControls).toContain("canChangeReveal={isGm}");
    const actions = contentControls.slice(
      contentControls.indexOf("function ContentActions"),
      contentControls.indexOf("function RevealIcon"),
    );
    expect(actions).not.toContain("ContentRevealButton");
  });

  it("redirects stale entity URLs after visibility is revoked", () => {
    expect(lorePage).toContain(
      "if (!mayViewEntity) redirect(campaignLoreIndexHref(campaignId, selectedCategory))",
    );
    expect(lorePage).toContain("if (!entityData || entityData.entity?.campaign_id !== campaignId)");
  });
});
