"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type ThemeId = "parchment" | "ivory" | "sage" | "midnight" | "ember" | "ink";
const validThemes = new Set<ThemeId>(["parchment", "ivory", "sage", "midnight", "ember", "ink"]);
const ThemeContext = createContext<{ theme: ThemeId; setTheme: (theme: ThemeId) => void } | null>(
  null,
);

function validTheme(theme: string): theme is ThemeId {
  return validThemes.has(theme as ThemeId);
}

export default function ThemeShell({
  children,
  initialTheme,
  userId,
}: {
  children: ReactNode;
  initialTheme: string;
  userId: string;
}) {
  const accountTheme = validTheme(initialTheme) ? initialTheme : "parchment";
  const [theme, setTheme] = useState<ThemeId>(accountTheme);
  const storageKey = `lorekeeper-theme:${userId}`;

  useEffect(() => {
    window.localStorage.setItem(storageKey, theme);
  }, [storageKey, theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return (
    <ThemeContext value={value}>
      <main className="lore-shell" data-theme={theme}>
        {children}
      </main>
    </ThemeContext>
  );
}

export function useAccountTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAccountTheme must be used inside ThemeShell.");
  return value;
}
