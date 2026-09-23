export const metadata = {
  title: "Disclaimer",
  description: "GabayNegosyo is not a government agency and does not replace official services.",
};

export default function DisclaimerPage() {
  return (
    <main className="screen legal-page">
      <header className="intro">
        <h1>Disclaimer</h1>
      </header>

      <section className="req-detail-section">
        <h2>Not a government service</h2>
        <p>
          GabayNegosyo is an independent, informational tool. It is not a government agency, is
          not affiliated with the Bureau of Internal Revenue, the Social Security System,
          PhilHealth, Pag-IBIG Fund, or any local government unit, and does not file anything,
          submit anything, or pay anything on your behalf.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>What is actually sourced today</h2>
        <p>
          BIR-related requirements are sourced from official forms and the current registration
          process (see each requirement&apos;s Source and Last verified line for exactly which).
          Content for other agencies (SSS, PhilHealth, Pag-IBIG, LGU business permits) is
          currently outline/placeholder content, not yet verified against official sources, and
          is labeled as such wherever it appears.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Penalty estimates</h2>
        <p>
          The Penalty Simulator produces estimates for awareness only. It is not a substitute for
          an actual computation by an accountant or by the BIR for official filing. Where the
          source material does not specify a penalty rate, the simulator says so instead of
          guessing.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Always verify</h2>
        <p>
          Requirements, forms, deadlines, and penalty rates change. Verify current requirements
          with the relevant agency, or with a qualified accountant or lawyer, before filing or
          paying anything.
        </p>
      </section>
    </main>
  );
}
