/**
 * Beautification pass §4, corrected: the original draft used --gn-blue and
 * --gn-violet at reduced opacity for decorative line art. --gn-blue no
 * longer exists (see DESIGN.md v3 — the blue-violet pairing was the exact
 * pattern that draft was rejected for elsewhere), and violet is reserved
 * for Premium surfaces only. Redrawn using the brand green plus the
 * functional teal ("completed") hue instead — same simple geometric line
 * art, 2px stroke, no new dependency.
 */
export type EmptyStateVariant = "no-profile" | "no-results" | "all-caught-up";

const STROKE_PROPS = {
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export default function EmptyStateIllustration({ variant }: { variant: EmptyStateVariant }) {
  if (variant === "no-profile") {
    return (
      <span className="empty-illustration" aria-hidden="true">
        <svg viewBox="0 0 96 96">
          <rect x="24" y="14" width="48" height="68" rx="6" stroke="var(--gn-green)" strokeOpacity="0.55" {...STROKE_PROPS} />
          <line x1="34" y1="32" x2="62" y2="32" stroke="var(--gn-green)" strokeOpacity="0.55" {...STROKE_PROPS} />
          <line x1="34" y1="44" x2="62" y2="44" stroke="var(--gn-green)" strokeOpacity="0.4" {...STROKE_PROPS} />
          <line x1="34" y1="56" x2="52" y2="56" stroke="var(--gn-green)" strokeOpacity="0.4" {...STROKE_PROPS} />
          <path d="M32 68 l6 6 12-13" stroke="var(--gn-teal)" strokeOpacity="0.8" {...STROKE_PROPS} />
        </svg>
      </span>
    );
  }

  if (variant === "all-caught-up") {
    return (
      <span className="empty-illustration" aria-hidden="true">
        <svg viewBox="0 0 96 96">
          <path
            d="M48 12 74 22v22c0 20-11 32-26 40-15-8-26-20-26-40V22Z"
            stroke="var(--gn-green)"
            strokeOpacity="0.45"
            {...STROKE_PROPS}
          />
          <path d="M36 47 45 56 62 38" stroke="var(--gn-teal)" strokeOpacity="0.85" {...STROKE_PROPS} />
        </svg>
      </span>
    );
  }

  // no-results
  return (
    <span className="empty-illustration" aria-hidden="true">
      <svg viewBox="0 0 96 96">
        <circle cx="42" cy="42" r="24" stroke="var(--gn-green)" strokeOpacity="0.5" {...STROKE_PROPS} />
        <line x1="60" y1="60" x2="80" y2="80" stroke="var(--gn-green)" strokeOpacity="0.5" {...STROKE_PROPS} />
      </svg>
    </span>
  );
}
