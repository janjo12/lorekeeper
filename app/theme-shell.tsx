"use client";

import type { ReactNode } from "react";
import { useTheme } from "@/app/theme-settings";

export default function ThemeShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <main className="lore-shell" data-theme={theme}>{children}</main>;
}
