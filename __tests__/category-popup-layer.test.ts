import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync(
  new URL("../app/data/campaign-lore/category-actions.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("category action popup layering", () => {
  it("renders the panel outside the scroll-clipped category sidebar", () => {
    expect(actions).toContain("createPortal(panel");
    expect(actions).toContain('closest(".lore-shell")');
  });

  it("uses a fixed high-level layer with viewport scrolling", () => {
    expect(styles).toMatch(/\.category-actions-panel\s*\{[\s\S]*?position: fixed;/);
    expect(styles).toMatch(/\.category-actions-panel\s*\{[\s\S]*?z-index: 250;/);
    expect(styles).toMatch(/\.category-actions-panel\s*\{[\s\S]*?overflow-y: auto;/);
  });
});
