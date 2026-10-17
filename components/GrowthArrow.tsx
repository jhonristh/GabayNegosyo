import { useId } from "react";

/**
 * Signature "growth arrow" — a faithful, simplified echo of the sweeping upward
 * arrow in the official GabayNegosyo logo (the logo file itself is untouched).
 * Purely decorative: aria-hidden, no text, no data. Motion is a CSS reveal that is
 * disabled under prefers-reduced-motion (see styles/emerald.css).
 */
export function GrowthArrow({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`gn-arrow ${className}`.trim()} viewBox="0 0 640 560" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#064E3B" />
          <stop offset="0.55" stopColor="#15803D" />
          <stop offset="1" stopColor="#84CC16" />
        </linearGradient>
        <linearGradient id={`${id}-head`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#4D9E1F" />
          <stop offset="1" stopColor="#A3E635" />
        </linearGradient>
      </defs>
      <path className="gn-arrow-swoosh" d="M0 548C210 566 430 474 566 306" stroke="#84CC16" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
      <path
        className="gn-arrow-body"
        d="M0 506C180 500 350 440 452 285C490 225 520 170 551 125L575 137C540 200 505 265 450 340C340 480 170 545 0 510Z"
        fill={`url(#${id}-body)`}
      />
      <path className="gn-arrow-head" d="M618 26L520 92L606 170Z" fill={`url(#${id}-head)`} />
    </svg>
  );
}

/** Subtle section divider wave (decorative). */
export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <svg className={`gn-wave ${className}`.trim()} viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 52C180 18 330 70 520 46S880 6 1200 30V80H0Z" fill="currentColor" opacity=".08" />
      <path d="M0 58C200 30 340 74 540 54S900 18 1200 40" stroke="#84CC16" strokeOpacity=".7" strokeWidth="2" fill="none" />
    </svg>
  );
}
