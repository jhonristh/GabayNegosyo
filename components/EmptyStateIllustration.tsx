/**
 * Beautification pass §4. Simple geometric line art, 2px stroke, using
 * --gn-blue / --gn-violet at reduced opacity so it matches the gradient
 * palette without reading as clipart. Hand-written inline SVG — no new
 * dependency, consistent with the rest of the icon system.
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
          <rect x="24" y="14" width="48" height="68" rx="6" stroke="var(--gn-blue)" strokeOpacity="0.6" {...STROKE_PROPS} />
          <line x1="34" y1="32" x2="62" y2="32" stroke="var(--gn-blue)" strokeOpacity="0.6" {...STROKE_PROPS} />
          <line x1="34" y1="44" x2="62" y2="44" stroke="var(--gn-violet)" strokeOpacity="0.6" {...STROKE_PROPS} />
          <line x1="34" y1="56" x2="52" y2="56" stroke="var(--gn-violet)" strokeOpacity="0.6" {...STROKE_PROPS} />
          <path d="M32 68 l6 6 12-13" stroke="var(--gn-teal)" strokeOpacity="0.7" {...STROKE_PROPS} />
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
            stroke="var(--gn-violet)"
            strokeOpacity="0.55"
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
        <circle cx="42" cy="42" r="24" stroke="var(--gn-blue)" strokeOpacity="0.6" {...STROKE_PROPS} />
        <line x1="60" y1="60" x2="80" y2="80" stroke="var(--gn-violet)" strokeOpacity="0.6" {...STROKE_PROPS} />
      </svg>
    </span>
  );
}
