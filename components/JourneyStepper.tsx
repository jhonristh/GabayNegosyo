import Link from "next/link";
import { JOURNEY, stageIndex, type JourneyStage } from "../lib/journey";

/** Five-stage progress indicator. Every stage stays a link: users may revisit any section. */
export default function JourneyStepper({ current }: { current: JourneyStage["key"] }) {
  const at = stageIndex(current);
  return (
    <nav className="journey-stepper" aria-label="Business lifecycle">
      <ol>
        {JOURNEY.map((stage, i) => {
          const state = i < at ? "done" : i === at ? "current" : "upcoming";
          return (
            <li key={stage.key} className={`journey-step journey-step--${state}`}>
              <Link href={stage.href} aria-current={state === "current" ? "step" : undefined}>
                <span className="journey-num" aria-hidden="true">{state === "done" ? "✓" : i + 1}</span>
                <span className="journey-label">{stage.label}</span>
                <span className="journey-state">{state === "done" ? "Visited stage" : state === "current" ? "You are here" : "Next stages"}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function JourneyHeader({ current, title, intro }: { current: JourneyStage["key"]; title: string; intro: string }) {
  const at = stageIndex(current);
  return (
    <>
      <JourneyStepper current={current} />
      <header className="intro">
        <p className="v06-eyebrow">STEP {at + 1} OF {JOURNEY.length} · {JOURNEY[at].question.toUpperCase()}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>
    </>
  );
}

/** Previous / next navigation with the primary "Proceed to …" CTA. */
export function JourneyNext({ current }: { current: JourneyStage["key"] }) {
  const at = stageIndex(current);
  const prev = JOURNEY[at - 1];
  const next = JOURNEY[at + 1];
  return (
    <div className="journey-next">
      {prev && <Link href={prev.href} className="secondary-btn">← Back to {prev.label}</Link>}
      {next ? (
        <Link href={next.href} className="primary-btn">Proceed to {next.label} →</Link>
      ) : (
        <Link href="/deadlines" className="primary-btn">Keep track of deadlines →</Link>
      )}
    </div>
  );
}
