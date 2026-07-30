import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../app/data/campaign-lore/create-fab", () => ({
  default: () => createElement("button", null, "Create entity or category"),
}));

vi.mock("../app/data/campaign-lore/entity-content-fab", () => ({
  default: () => createElement("button", null, "Create textbox or image"),
}));

let CampaignCreationControls: typeof import("../app/data/campaign-lore/creation-controls").CampaignCreationControls;
let EntityCreationControls: typeof import("../app/data/campaign-lore/creation-controls").EntityCreationControls;

beforeAll(async () => {
  ({ CampaignCreationControls, EntityCreationControls } = await import(
    "../app/data/campaign-lore/creation-controls"
  ));
});

describe("campaign lore creation controls", () => {
  it("shows entity and category creation to the campaign GM", () => {
    const html = renderToStaticMarkup(
      createElement(CampaignCreationControls, {
        isGm: true,
        campaignId: "campaign-1",
        categories: [],
      }),
    );

    expect(html).toContain("Create entity or category");
  });

  it("hides entity and category creation from a campaign player", () => {
    const html = renderToStaticMarkup(
      createElement(CampaignCreationControls, {
        isGm: false,
        campaignId: "campaign-1",
        categories: [],
      }),
    );

    expect(html).not.toContain("Create entity or category");
  });

  it("shows textbox and image creation to the campaign GM", () => {
    const html = renderToStaticMarkup(
      createElement(EntityCreationControls, {
        isGm: true,
        entityId: "entity-1",
      }),
    );

    expect(html).toContain("Create textbox or image");
  });

  it("hides textbox and image creation from a campaign player", () => {
    const html = renderToStaticMarkup(
      createElement(EntityCreationControls, {
        isGm: false,
        entityId: "entity-1",
      }),
    );

    expect(html).not.toContain("Create textbox or image");
  });
});
