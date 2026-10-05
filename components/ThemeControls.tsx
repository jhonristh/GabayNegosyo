"use client";

import { useCallback, useEffect, useState } from "react";
import KitIcon from "./KitIcon";
import {
  THEME_CHANGE_EVENT,
  THEME_COLORS,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "../lib/theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference, systemPrefersDark());
  document.documentElement.setAttribute("data-theme", resolved);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[resolved]);
  return resolved;
}

function readStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "light"; // storage blocked: still usable, just not remembered
  }
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>("light");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  // Read the saved choice once on mount and stay in sync with other tabs and
  // other instances of these controls (sidebar toggle + account picker).
  useEffect(() => {
    const sync = () => {
      const stored = readStoredPreference();
      setPreference(stored);
      setResolved(applyTheme(stored));
    };
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // "Match device" must react when the device flips light/dark.
  useEffect(() => {
    if (preference !== "system" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const update = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* not remembered, but the change still applies for this visit */
    }
    setPreference(next);
    setResolved(applyTheme(next));
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return { preference, resolved, update };
}

/** Compact light/Night Shift switch for headers and sidebars. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolved, update } = useTheme();
  const isNight = resolved === "night";
  return (
    <button
      type="button"
      className={`kit-theme-toggle ${className}`.trim()}
      aria-pressed={isNight}
      onClick={() => update(isNight ? "light" : "night")}
    >
      <KitIcon name={isNight ? "sun" : "moon"} size={18} />
      <span>{isNight ? "Light mode" : "Night Shift"}</span>
    </button>
  );
}

/** Full three-way picker for the Account page. Native radios keep arrow-key navigation. */
export function ThemePicker() {
  const { preference, update } = useTheme();
  return (
    <fieldset className="kit-theme-picker">
      <legend>Appearance</legend>
      {THEME_OPTIONS.map((option) => (
        <label key={option.value} className={preference === option.value ? "selected" : ""}>
          <input
            type="radio"
            name="gn-theme"
            value={option.value}
            checked={preference === option.value}
            onChange={() => update(option.value)}
          />
          <span>
            <strong>{option.label}</strong>
            <small>{option.hint}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
