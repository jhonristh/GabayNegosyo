import BusinessJourney from "./BusinessJourney";
/**
 * Beautification pass §4, corrected: the original draft used --gn-blue and
 * --gn-violet at reduced opacity for decorative line art. --gn-blue no
 * longer exists (see docs/DESIGN.md §1 — the blue-violet pairing was the exact
 * pattern that draft was rejected for elsewhere), and violet is reserved
 * for Premium surfaces only. Redrawn using the brand green plus the
 * functional teal ("completed") hue instead — same simple geometric line
 * art, 2px stroke, no new dependency.
 */
export type EmptyStateVariant = "no-profile" | "no-results" | "all-caught-up" | "offline";

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

  if (variant === "all-caught-up") return <BusinessJourney completed={1} total={1} compact />;
  if (variant === "offline") return <span className="empty-illustration" aria-hidden="true"><svg viewBox="0 0 96 96" {...STROKE_PROPS} stroke="var(--gn-green)"><rect x="23" y="12" width="50" height="72" rx="8"/><path d="M40 74H56M15 20L81 80M33 41Q48 29 63 41M40 49Q48 43 56 49"/></svg></span>;

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
