import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../app/data/sidebar.tsx", import.meta.url), "utf8");
const campaignsPage = readFileSync(
  new URL("../app/data/campaigns/page.tsx", import.meta.url),
  "utf8",
);
const entityView = readFileSync(
  new URL("../app/data/campaign-lore/entity-view.tsx", import.meta.url),
  "utf8",
);

describe("responsive navigation", () => {
  it("switches to the mobile navigation instead of an icon-only rail on narrow screens", () => {
    expect(css).toContain("@media (max-width: 64rem)");
    expect(css).not.toContain("@media (max-width: 42rem)");
    expect(css).not.toContain("grid-template-columns: 5rem minmax(0, 1fr)");
    expect(css).toMatch(
      /@media \(max-width: 64rem\)\s*\{[\s\S]*?\.lore-shell\s*\{[\s\S]*?\.mobile-nav-bar\s*\{[^}]*display:\s*flex;[^}]*height:\s*3\.5rem;/,
    );
    expect(css).toMatch(
      /\.lore-sidebar\.is-mobile-open \.lore-sidebar-inner\s*\{\s*display:\s*block;\s*\}/,
    );
  });

  it("provides an accessible toggle for the collapsible navigation", () => {
    expect(sidebar).toContain('aria-controls="main-navigation"');
    expect(sidebar).toContain("aria-expanded={mobileMenuOpen}");
    expect(sidebar).toContain('id="main-navigation"');
  });
});

describe("compact inline form sizing", () => {
  it("shares a compact control height between campaign and tag creation", () => {
    expect(css).toMatch(
      /\.compact-inline-form\s*\{[^}]*--inline-control-min-height:\s*2\.25rem;[^}]*min-height:\s*0;[^}]*height:\s*auto;/,
    );
    expect(css).toMatch(
      /\.compact-inline-form input,\s*\.compact-inline-form select,\s*\.compact-inline-form \.primary-button,\s*\.compact-inline-form \.secondary-button\s*\{[^}]*min-height:\s*var\(--inline-control-min-height\);[^}]*height:\s*auto;[^}]*padding-block:\s*0\.25rem;[^}]*line-height:\s*1\.25rem;/,
    );
    expect(css).not.toContain("height: var(--inline-control-height)");
    expect(campaignsPage).toContain(
      'className="inline-create-form compact-inline-form campaign-create-form"',
    );
    expect(entityView).toContain('className="inline-create-form compact-inline-form"');
  });

  it("uses non-growing, full-width mobile controls by default", () => {
    expect(css).toMatch(
      /\.inline-create-form\s*\{[^}]*flex-direction:\s*column;[^}]*align-items:\s*stretch;/,
    );
    expect(css).toMatch(
      /\.inline-create-form input\s*\{[^}]*flex:\s*0 0 auto;[^}]*width:\s*100%;[^}]*min-width:\s*0;/,
    );
    expect(css).toMatch(
      /\.inline-create-form select\s*\{[^}]*flex:\s*0 0 auto;[^}]*width:\s*100%;[^}]*min-width:\s*0;/,
    );
    expect(css).toMatch(/\.campaign-create-form\s*\{[^}]*align-self:\s*stretch;/);
  });

  it("adds horizontal layout and campaign-specific width caps only on wide screens", () => {
    expect(css).toContain("--campaign-input-max-width: 18rem");
    expect(css).toContain("--campaign-button-max-width: 12rem");
    expect(css).toMatch(
      /@media \(min-width: 64\.0625rem\)\s*\{[\s\S]*?\.inline-create-form\s*\{[^}]*flex-flow:\s*row wrap;[^}]*align-items:\s*center;/,
    );
    expect(css).toMatch(
      /@media \(min-width: 64\.0625rem\)\s*\{[\s\S]*?\.campaign-create-form\s*\{[^}]*align-self:\s*flex-end;/,
    );
    expect(css).toMatch(
      /@media \(min-width: 64\.0625rem\)\s*\{[\s\S]*?\.campaign-create-form input\s*\{[^}]*max-width:\s*var\(--campaign-input-max-width\);/,
    );
    expect(css).toMatch(
      /@media \(min-width: 64\.0625rem\)\s*\{[\s\S]*?\.campaign-create-form \.primary-button\s*\{[^}]*max-width:\s*var\(--campaign-button-max-width\);/,
    );
  });
});
