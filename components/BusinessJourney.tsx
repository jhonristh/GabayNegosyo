/** Decorative business illustration driven by actual checklist completion.
 * Completion is self-reported progress, never government approval. */
export default function BusinessJourney({ completed = 0, total = 0, compact = false }: { completed?: number; total?: number; compact?: boolean }) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, completed / total)) : 0;
  const stage = ratio >= 1 ? 3 : ratio >= .5 ? 2 : ratio > 0 ? 1 : 0;
  const labels = ["Your foundation starts here", "Your business is taking shape", "One step closer", "Your checklist is complete"];
  return <div className={`ew-journey ${compact ? "ew-journey--compact" : ""}`} data-stage={stage}>
    <svg viewBox="0 0 320 195" fill="none" aria-hidden="true">
      <path d="M25 174H295" stroke="currentColor" strokeWidth="2" />
      <rect x="72" y="77" width="176" height="96" rx="3" className="ew-shop-base" />
      <g className={`ew-shop-part ${stage >= 1 ? "is-built" : ""}`}><rect x="88" y="106" width="72" height="49" rx="3"/><path d="M124 106V155M88 130H160"/><rect x="180" y="107" width="49" height="66" rx="3"/><path d="M218 138V145"/></g>
      <g className={`ew-shop-part ${stage >= 2 ? "is-built" : ""}`}><path d="M68 78L82 48H238L252 78V89C241 100 229 100 218 89C207 100 195 100 184 89C173 100 161 100 150 89C139 100 127 100 116 89C105 100 93 100 82 89L68 89Z" className="ew-awning"/><path d="M102 49L94 78M131 49L127 78M160 49V78M189 49L193 78M218 49L226 78"/></g>
      <g className={`ew-shop-part ${stage >= 3 ? "is-built" : ""}`}><rect x="106" y="13" width="108" height="27" rx="5" className="ew-shop-sign"/><path d="M123 40V48M197 40V48M132 26H188"/><path d="M267 151C250 146 254 127 266 124C264 107 282 109 282 123C298 126 292 145 277 148V163"/><path d="M260 159H286L282 174H264Z" className="ew-shop-sign"/></g>
      <path d="M41 162V142M32 151H50" stroke="currentColor" strokeWidth="2"/>
    </svg>
    {!compact && <><strong>{labels[stage]}</strong><p>Your illustration grows with your checklist. Completion is self-reported, not official approval.</p></>}
  </div>;
}
