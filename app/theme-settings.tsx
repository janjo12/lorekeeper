"use client";

import { useSyncExternalStore } from "react";

const themes = [
  { id: "parchment", name: "Parchment", mode: "Light", colors: ["#efe5d1", "#fffaf0", "#75501f"] },
  { id: "ivory", name: "Ivory", mode: "Light", colors: ["#f5f2ea", "#ffffff", "#375f6b"] },
  { id: "sage", name: "Sage", mode: "Light", colors: ["#e5eadf", "#f8faf4", "#516346"] },
  { id: "midnight", name: "Midnight", mode: "Dark", colors: ["#111827", "#1f2937", "#7dd3fc"] },
  { id: "ember", name: "Ember", mode: "Dark", colors: ["#211714", "#34231e", "#e89b64"] },
  { id: "ink", name: "Ink", mode: "Dark", colors: ["#151515", "#242424", "#d6c5a1"] },
] as const;

type ThemeId = (typeof themes)[number]["id"];
const themeEvent = "lorekeeper-theme-change";

function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

function getThemeSnapshot(): ThemeId {
  const savedTheme = window.localStorage.getItem("lorekeeper-theme");
  return isThemeId(savedTheme) ? savedTheme : "parchment";
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener(themeEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(themeEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export default function ThemeSettings() {
  const theme = useTheme();

  function selectTheme(nextTheme: ThemeId) {
    window.localStorage.setItem("lorekeeper-theme", nextTheme);
    window.dispatchEvent(new Event(themeEvent));
  }

  return (
    <fieldset className="theme-picker">
      <legend className="setting-label">Theme</legend>
      <p className="setting-description">Choose how your lore workspace looks. Your choice is saved on this device.</p>
      <div className="theme-groups">
        {(["Light", "Dark"] as const).map((mode) => (
          <section className="theme-group" key={mode} aria-labelledby={`${mode.toLowerCase()}-themes`}>
            <h3 id={`${mode.toLowerCase()}-themes`}>{mode} themes</h3>
            <div className="theme-options">
              {themes.filter((option) => option.mode === mode).map((option) => (
                <label className={`theme-option${theme === option.id ? " is-selected" : ""}`} key={option.id}>
                  <input
                    checked={theme === option.id}
                    name="theme"
                    onChange={() => selectTheme(option.id)}
                    type="radio"
                    value={option.id}
                  />
                  <span className="theme-swatches" aria-hidden="true">
                    {option.colors.map((color) => <span key={color} style={{ background: color }} />)}
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

export function useTheme() {
  return useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "parchment");
}
