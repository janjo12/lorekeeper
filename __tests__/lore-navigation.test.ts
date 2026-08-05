import { describe, expect, it } from "vitest";
import { campaignLoreIndexHref } from "../app/data/campaign-lore/lore-navigation";

describe("campaign lore canonical navigation", () => {
  it("removes stale entity parameters and preserves a valid category", () => {
    expect(campaignLoreIndexHref("campaign-1", "category-1")).toBe(
      "/data/campaign-lore?campaign=campaign-1&category=category-1",
    );
  });

  it("encodes query parameter values", () => {
    expect(campaignLoreIndexHref("campaign & one")).toBe(
      "/data/campaign-lore?campaign=campaign+%26+one",
    );
  });
});
