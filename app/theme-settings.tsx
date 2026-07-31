"use client";

import { useState, useTransition } from "react";
import { saveTheme } from "@/app/data/actions";
import { type ThemeId, useAccountTheme } from "@/app/theme-shell";
import { FormMessage } from "@/app/components/form-feedback";

const themes = [
  { id: "parchment", name: "Parchment", mode: "Light", colors: ["#efe5d1", "#fffaf0", "#5b3a13"] },
  { id: "ivory", name: "Ivory", mode: "Light", colors: ["#f5f2ea", "#ffffff", "#294f5a"] },
  { id: "sage", name: "Sage", mode: "Light", colors: ["#e5eadf", "#f8faf4", "#374b2f"] },
  { id: "midnight", name: "Midnight", mode: "Dark", colors: ["#0d1422", "#182433", "#9bddfc"] },
  { id: "ember", name: "Ember", mode: "Dark", colors: ["#1b110f", "#2d1c18", "#ffc092"] },
  { id: "ink", name: "Ink", mode: "Dark", colors: ["#101010", "#202020", "#e3d2ae"] },
] as const;

export default function ThemeSettings() {
  const { theme, setTheme } = useAccountTheme();
  const [saving, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function selectTheme(nextTheme: ThemeId) {
    const previousTheme = theme;
    setError(undefined);
    setTheme(nextTheme);
    startTransition(async () => {
      try {
        await saveTheme(nextTheme);
      } catch (reason) {
        console.error("Theme update failed", reason);
        setTheme(previousTheme);
        setError("We couldn’t save that theme. Your previous theme has been restored.");
      }
    });
  }

  return (
    <fieldset className="theme-picker" disabled={saving}>
      <legend className="setting-label">Theme</legend>
      <p className="setting-description">
        Choose how your lore workspace looks. Your choice follows your account across devices.
      </p>
      <FormMessage>{error}</FormMessage>
      <div className="theme-groups">
        {(["Light", "Dark"] as const).map((mode) => (
          <section
            className="theme-group"
            key={mode}
            aria-labelledby={`${mode.toLowerCase()}-themes`}
          >
            <h3 id={`${mode.toLowerCase()}-themes`}>{mode} themes</h3>
            <div className="theme-options">
              {themes
                .filter((option) => option.mode === mode)
                .map((option) => (
                  <label
                    className={`theme-option${theme === option.id ? " is-selected" : ""}`}
                    key={option.id}
                  >
                    <input
                      checked={theme === option.id}
                      name="theme"
                      onChange={() => selectTheme(option.id)}
                      type="radio"
                      value={option.id}
                    />
                    <span className="theme-swatches" aria-hidden="true">
                      {option.colors.map((color) => (
                        <span key={color} style={{ background: color }} />
                      ))}
                    </span>
                    <span>{option.name}</span>
                  </label>
                ))}
            </div>
          </section>
        ))}
      </div>
    </fieldset>
  );
}
