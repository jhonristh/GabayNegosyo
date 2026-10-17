import LegalPage from "../../components/LegalPage";

export const metadata = {
  title: "Disclaimer",
  description: "GabayNegosyo is not a government agency and does not replace official services.",
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      current="disclaimer"
      eyebrow="LEGAL · DISCLAIMER"
      title="Disclaimer"
      lead="What GabayNegosyo is, what it is not, and what to double-check before you file or pay anything."
      facts={[
        { label: "Independent", text: "Not a government agency." },
        { label: "Estimates only", text: "Penalty figures are for awareness." },
        { label: "Verify first", text: "Confirm with the agency before filing." },
      ]}
      sections={[
        {
          id: "not-government",
          title: "Not a government service",
          tone: "key",
          children: (
            <p>
              GabayNegosyo is an independent, informational tool. It is not a government agency, is
              not affiliated with the Bureau of Internal Revenue, the Social Security System,
              PhilHealth, Pag-IBIG Fund, or any local government unit, and does not file anything,
              submit anything, or pay anything on your behalf.
            </p>
          ),
        },
        {
          id: "sourced-today",
          title: "What is actually sourced today",
          children: (
            <p>
              BIR-related requirements are sourced from official forms and the current registration
              process (see each requirement&apos;s Source and Last verified line for exactly which).
              Content for other agencies (SSS, PhilHealth, Pag-IBIG, LGU business permits) is
              currently outline/placeholder content, not yet verified against official sources, and
              is labeled as such wherever it appears.
            </p>
          ),
        },
        {
          id: "penalty-estimates",
          title: "Penalty estimates",
          children: (
            <p>
              The Penalty Simulator produces estimates for awareness only. It is not a substitute for
              an actual computation by an accountant or by the BIR for official filing. Where the
              source material does not specify a penalty rate, the simulator says so instead of
              guessing.
            </p>
          ),
        },
        {
          id: "always-verify",
          title: "Always verify",
          children: (
            <p>
              Requirements, forms, deadlines, and penalty rates change. Verify current requirements
              with the relevant agency, or with a qualified accountant or lawyer, before filing or
              paying anything.
            </p>
          ),
        },
      ]}
    />
  );
}
