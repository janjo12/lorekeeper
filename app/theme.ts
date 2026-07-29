export const themeIds = ["parchment", "ivory", "sage", "midnight", "ember", "ink"] as const;

export type ThemeId = (typeof themeIds)[number];

export function isThemeId(theme: string): theme is ThemeId {
  return (themeIds as readonly string[]).includes(theme);
}