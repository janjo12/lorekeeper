"use client";

import { useTransition } from "react";
import { saveTheme } from "@/app/data/actions";
import { type ThemeId, useAccountTheme } from "@/app/theme-shell";

const themes = [
  { id: "parchment", name: "Parchment", mode: "Light", colors: ["#efe5d1", "#fffaf0", "#75501f"] },
  { id: "ivory", name: "Ivory", mode: "Light", colors: ["#f5f2ea", "#ffffff", "#375f6b"] },
  { id: "sage", name: "Sage", mode: "Light", colors: ["#e5eadf", "#f8faf4", "#516346"] },
  { id: "midnight", name: "Midnight", mode: "Dark", colors: ["#111827", "#1f2937", "#7dd3fc"] },
  { id: "ember", name: "Ember", mode: "Dark", colors: ["#211714", "#34231e", "#e89b64"] },
  { id: "ink", name: "Ink", mode: "Dark", colors: ["#151515", "#242424", "#d6c5a1"] },
] as const;

export default function ThemeSettings() {
  const { theme, setTheme } = useAccountTheme();
  const [saving, startTransition] = useTransition();

  function selectTheme(nextTheme: ThemeId) {
    const previousTheme = theme;
    setTheme(nextTheme);
    startTransition(async () => {
      try {
        await saveTheme(nextTheme);
      } catch {
        setTheme(previousTheme);
      }
    });
  }

  return (
    <fieldset className="theme-picker" disabled={saving}>
      <legend className="setting-label">Theme</legend>
      <p className="setting-description">
        Choose how your lore workspace looks. Your choice follows your account across devices.
      </p>
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
