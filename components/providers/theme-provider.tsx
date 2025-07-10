"use client";

import { useThemeStore } from "@/lib/stores/theme-store";
import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentTheme, themes } = useThemeStore();

  useEffect(() => {
    const theme = themes.find((t) => t.id === currentTheme);
    if (!theme) return;

    const root = document.documentElement;
    
    // Apply theme colors to CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }, [currentTheme, themes]);

  return <>{children}</>;
}