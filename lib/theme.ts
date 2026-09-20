"use client";

import { useCallback, useEffect, useState } from "react";

const THEME_KEY = "gn_theme";

/**
 * Beautification pass §8. Reads the theme already applied to <html> by the
 * blocking init script in app/layout.tsx (avoids a flash-of-wrong-theme on
 * load), and gives components a way to read/toggle it. Persists explicit
 * user choice to localStorage; first-visit default comes from
 * prefers-color-scheme via the same init script.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setThemeState(current);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(THEME_KEY, next);
    setThemeState(next);
  }, []);

  return { theme, toggleTheme };
}
