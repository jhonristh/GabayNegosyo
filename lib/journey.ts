/**
 * The GabayNegosyo business lifecycle, in order. Navigation, the step
 * indicator and every "Proceed to …" CTA read from this one list.
 */
export interface JourneyStage {
  key: "checklist" | "registration" | "bir-forms" | "penalties" | "renewal";
  href: string;
  label: string; // full name (desktop nav, stepper)
  short: string; // compact label (mobile bar)
  question: string; // the plain-language question this stage answers
}

export const JOURNEY: JourneyStage[] = [
  { key: "checklist", href: "/checklist", label: "Checklist", short: "Checklist", question: "What do I need?" },
  { key: "registration", href: "/registration", label: "Business Registration", short: "Register", question: "How do I register?" },
  { key: "bir-forms", href: "/bir-forms", label: "BIR Forms", short: "BIR Forms", question: "Which BIR forms do I file?" },
  { key: "penalties", href: "/penalties", label: "Penalties", short: "Penalties", question: "What if I'm late?" },
  { key: "renewal", href: "/renewal", label: "Renewal & Post-Registration", short: "Renewal", question: "How do I stay compliant?" },
];

export function stageIndex(key: JourneyStage["key"]): number {
  return JOURNEY.findIndex((s) => s.key === key);
}
