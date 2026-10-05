/**
 * THEME (Night Shift design kit)
 * ──────────────────────────────
 * The product has two looks: the default light workspace and the optional
 * high-contrast "Night Shift" workspace. The choice is a per-browser
 * convenience stored in localStorage; nothing is sent to Supabase.
 *
 *   "light"  – always the default light look
 *   "night"  – always Night Shift
 *   "system" – follow the device's dark-mode setting
 *
 * The resolved value is written to `<html data-theme="light|night">`, which
 * `styles/kits.css` reads. Default for a first-time visitor is "light", so
 * nobody gets a dark UI they did not ask for.
 */

export type ThemePreference = "light" | "night" | "system";
export type ResolvedTheme = "light" | "night";

export const THEME_STORAGE_KEY = "gn-theme";
export const THEME_CHANGE_EVENT = "gn-theme-change";

export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#145D2D",
  night: "#151917",
};

export const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "The standard GabayNegosyo look." },
  { value: "night", label: "Night Shift", hint: "High-contrast dark workspace." },
  { value: "system", label: "Match device", hint: "Follow your phone or computer setting." },
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "night" || value === "system";
}

/** Anything unrecognised (missing, corrupted, hand-edited) falls back to light. */
export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  return isThemePreference(raw) ? raw : "light";
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "night") return "night";
  if (preference === "system") return systemPrefersDark ? "night" : "light";
  return "light";
}

/**
 * Runs in <head> before first paint so a saved Night Shift choice does not
 * flash white. Kept dependency-free and wrapped in try/catch: storage can be
 * blocked (private mode, strict cookie settings) and that must never break
 * the page. Mirrors parseThemePreference + resolveTheme above.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="night"&&p!=="system")p="light";var n=p==="night"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",n?"night":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
