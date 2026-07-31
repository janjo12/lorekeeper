// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeShell from "../app/theme-shell";

function useSystemDarkMode(dark: boolean) {
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: dark,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe("system theme preference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("defaults an automatic preference to Midnight when the system is dark", async () => {
    useSystemDarkMode(true);
    const { container } = render(
      <ThemeShell initialTheme="system" userId="new-user">
        <p>Lore</p>
      </ThemeShell>,
    );

    await waitFor(() =>
      expect(container.querySelector(".lore-shell")?.getAttribute("data-theme")).toBe("midnight"),
    );
  });

  it("defaults an automatic preference to Parchment when the system is light", async () => {
    useSystemDarkMode(false);
    const { container } = render(
      <ThemeShell initialTheme="system" userId="new-user">
        <p>Lore</p>
      </ThemeShell>,
    );

    await waitFor(() =>
      expect(container.querySelector(".lore-shell")?.getAttribute("data-theme")).toBe("parchment"),
    );
  });

  it("does not override an explicitly saved theme", async () => {
    useSystemDarkMode(true);
    window.localStorage.setItem("lorekeeper-theme:existing-user", "sage");
    const { container } = render(
      <ThemeShell initialTheme="sage" userId="existing-user">
        <p>Lore</p>
      </ThemeShell>,
    );

    await waitFor(() =>
      expect(container.querySelector(".lore-shell")?.getAttribute("data-theme")).toBe("sage"),
    );
  });

  it("treats an untouched legacy Parchment default as automatic", async () => {
    useSystemDarkMode(true);
    const { container } = render(
      <ThemeShell initialTheme="parchment" userId="legacy-user">
        <p>Lore</p>
      </ThemeShell>,
    );

    await waitFor(() =>
      expect(container.querySelector(".lore-shell")?.getAttribute("data-theme")).toBe("midnight"),
    );
  });
});
