import type { RequirementStatus } from "../lib/types";

/**
 * Beautification pass §3: replaces raw Unicode glyphs (✓ ● ⚠ ■) previously
 * used via CSS `content`, which rendered inconsistently on Android
 * (notably ⚠ as a colored emoji glyph on some devices). Same shape
 * semantics per status — documented as an accessibility requirement in
 * DESIGN.md §3 — implemented as hand-written inline SVG (no icon-font
 * package) to keep bundle size flat on low-end Android hardware.
 */
export default function StatusIcon({ status }: { status: RequirementStatus }) {
  switch (status) {
    case "completed":
      // check
      return (
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8.5 6.2 12 13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "due_soon":
      // filled circle
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="5" fill="currentColor" />
        </svg>
      );
    case "due_today":
      // ring — distinct from the solid due_soon dot and the overdue triangle
      return (
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    case "overdue":
      // warning triangle
      return (
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 2.5 14.5 13.5H1.5L8 2.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="11.3" r="0.9" fill="currentColor" />
        </svg>
      );
    case "upcoming":
    default:
      // filled square
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="currentColor" />
        </svg>
      );
  }
}
