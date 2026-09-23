import { siteConfig } from "../../lib/siteConfig";

export const metadata = {
  title: "Terms of Use",
  description: "The terms for using GabayNegosyo.",
};

export default function TermsPage() {
  return (
    <main className="screen legal-page">
      <header className="intro">
        <h1>Terms of Use</h1>
        <p className="hint">Last updated: see the date of this deployment.</p>
      </header>

      <section className="req-detail-section">
        <h2>What GabayNegosyo is</h2>
        <p>
          GabayNegosyo is an independent informational and compliance guidance platform. It is
          not a government agency, is not affiliated with the BIR or any other government
          agency, and does not replace official government services or professional advice from
          an accountant or lawyer.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Accuracy</h2>
        <p>
          Content is sourced from official BIR forms and processes where marked as such (see each
          requirement&apos;s Source and Last verified line), and clearly labeled where it is a
          prototype placeholder instead. We work to keep sourced content accurate, but
          requirements, forms, and deadlines change; always verify with the relevant agency
          before filing or paying anything.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Your account</h2>
        <p>
          You&apos;re responsible for the accuracy of the information you enter and for keeping
          your login credentials secure. Demo accounts are sandboxed and may be reset at any
          time.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Premium</h2>
        <p>
          Upgrading to Premium in this version of the app is simulated: no payment is taken, and
          no real subscription is created.
          {siteConfig.premiumPriceLabel ? ` Premium pricing: ${siteConfig.premiumPriceLabel}.` : ""}
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Limitation of liability</h2>
        <p>
          GabayNegosyo is provided as-is, without warranty of any kind. We are not liable for
          penalties, missed deadlines, or other consequences arising from reliance on this app in
          place of official sources or professional advice.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Contact</h2>
        <p>
          {siteConfig.contactEmail ? (
            <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
          ) : (
            "Contact address not yet configured"
          )}
          .
        </p>
      </section>
    </main>
  );
}
