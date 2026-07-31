import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const themeIds = ["parchment", "ivory", "sage", "midnight", "ember", "ink"] as const;

type Palette = Record<string, string>;

function variablesFrom(block: string): Palette {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[\da-f]{3,8});/gi)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}

function blockFor(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Missing theme block: ${selector}`);
  return match[1];
}

function expandHex(hex: string) {
  const value = hex.slice(1);
  if (value.length === 3) return value.split("").map((digit) => digit.repeat(2)).join("");
  if (value.length === 6) return value;
  throw new Error(`Unsupported contrast color: ${hex}`);
}

function luminance(hex: string) {
  const channels = expandHex(hex)
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first: string, second: string) {
  const light = Math.max(luminance(first), luminance(second));
  const dark = Math.min(luminance(first), luminance(second));
  return (light + 0.05) / (dark + 0.05);
}

const basePalette = variablesFrom(blockFor(".lore-shell"));

function paletteFor(theme: (typeof themeIds)[number]) {
  if (theme === "parchment") return basePalette;
  return {
    ...basePalette,
    ...variablesFrom(blockFor(`.lore-shell[data-theme="${theme}"]`)),
  };
}

describe("theme contrast", () => {
  it.each(themeIds)("%s keeps normal text at AAA contrast", (theme) => {
    const palette = paletteFor(theme);

    for (const foreground of ["shell-text", "muted-text", "accent", "danger", "success"]) {
      for (const background of ["shell-bg", "surface"]) {
        expect(
          contrast(palette[foreground], palette[background]),
          `${theme}: --${foreground} on --${background}`,
        ).toBeGreaterThanOrEqual(7);
      }
    }
    expect(
      contrast(palette.accent, palette["accent-soft"]),
      `${theme}: --accent on --accent-soft`,
    ).toBeGreaterThanOrEqual(7);
  });

  it.each(themeIds)("%s keeps controls and navigation at AAA contrast", (theme) => {
    const palette = paletteFor(theme);

    for (const background of ["fab", "fab-hover"]) {
      expect(
        contrast(palette["on-fab"], palette[background]),
        `${theme}: --on-fab on --${background}`,
      ).toBeGreaterThanOrEqual(7);
    }
    expect(contrast(palette.surface, palette.accent), `${theme}: filled actions`).toBeGreaterThanOrEqual(
      7,
    );
    expect(
      contrast(palette["sidebar-text"], palette.sidebar),
      `${theme}: sidebar text`,
    ).toBeGreaterThanOrEqual(7);
    expect(
      contrast(palette["sidebar-accent"], palette["sidebar-hover"]),
      `${theme}: active sidebar text`,
    ).toBeGreaterThanOrEqual(7);
  });

  it.each(themeIds)("%s keeps component boundaries distinguishable", (theme) => {
    const palette = paletteFor(theme);

    for (const background of ["shell-bg", "surface"]) {
      expect(
        contrast(palette.border, palette[background]),
        `${theme}: --border on --${background}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
