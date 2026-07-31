export const themeIds = ["parchment", "ivory", "sage", "midnight", "ember", "ink"] as const;
export const themePreferenceIds = ["system", ...themeIds] as const;

export type ThemeId = (typeof themeIds)[number];
export type ThemePreference = (typeof themePreferenceIds)[number];

export function isThemeId(theme: string): theme is ThemeId {
  return (themeIds as readonly string[]).includes(theme);
}

export function isThemePreference(theme: string): theme is ThemePreference {
  return (themePreferenceIds as readonly string[]).includes(theme);
}
