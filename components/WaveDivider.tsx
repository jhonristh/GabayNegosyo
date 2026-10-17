/** Subtle section divider wave (decorative). */
export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <svg className={`gn-wave ${className}`.trim()} viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 52C180 18 330 70 520 46S880 6 1200 30V80H0Z" fill="currentColor" opacity=".08" />
      <path d="M0 58C200 30 340 74 540 54S900 18 1200 40" stroke="#84CC16" strokeOpacity=".7" strokeWidth="2" fill="none" />
    </svg>
  );
}
