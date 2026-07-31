"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  isThemePreference,
  type ThemeId,
  type ThemePreference,
} from "./theme";

export type { ThemeId, ThemePreference } from "./theme";

const ThemeContext = createContext<{
  theme: ThemeId;
  preference: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
} | null>(null);

export default function ThemeShell({
  children,
  initialTheme,
  userId,
}: {
  children: ReactNode;
  initialTheme: string;
  userId: string;
}) {
  const accountPreference = isThemePreference(initialTheme) ? initialTheme : "system";
  const [preference, setTheme] = useState<ThemePreference>(accountPreference);
  const [systemTheme, setSystemTheme] = useState<ThemeId>("parchment");
  const storageKey = `lorekeeper-theme:${userId}`;

  useEffect(() => {
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemTheme(colorScheme.matches ? "midnight" : "parchment");
    updateSystemTheme();
    colorScheme.addEventListener("change", updateSystemTheme);
    return () => colorScheme.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    // Before the system preference existed, untouched accounts were stored as
    // parchment. A local value means the user has already used the theme UI.
    if (initialTheme === "parchment" && !window.localStorage.getItem(storageKey)) {
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) setTheme("system");
      });
      return () => {
        cancelled = true;
      };
    }
  }, [initialTheme, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, preference);
  }, [preference, storageKey]);

  const theme = preference === "system" ? systemTheme : preference;
  const value = useMemo(() => ({ theme, preference, setTheme }), [preference, theme]);
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
