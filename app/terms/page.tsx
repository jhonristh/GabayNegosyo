import LegalPage from "../../components/LegalPage";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = {
  title: "Terms of Use",
  description: "The terms for using GabayNegosyo.",
};

export default function TermsPage() {
  return (
    <LegalPage
      current="terms"
      eyebrow="LEGAL · TERMS"
      title="Terms of Use"
      lead="The ground rules for using GabayNegosyo, in plain language."
      updated="Last updated: see the date of this deployment."
      facts={[
        { label: "Independent", text: "Not a government agency." },
        { label: "Premium is simulated", text: "No payment is taken in this version." },
        { label: "Verify with agencies", text: "Before filing or paying anything." },
      ]}
      sections={[
        {
          id: "what-it-is",
          title: "What GabayNegosyo is",
          tone: "key",
          children: (
            <p>
              GabayNegosyo is an independent informational and compliance guidance platform. It is
              not a government agency, is not affiliated with the BIR or any other government
              agency, and does not replace official government services or professional advice from
              an accountant or lawyer.
            </p>
          ),
        },
        {
          id: "accuracy",
          title: "Accuracy",
          children: (
            <p>
              Content is sourced from official BIR forms and processes where marked as such (see each
              requirement&apos;s Source and Last verified line), and clearly labeled where it is a
              prototype placeholder instead. We work to keep sourced content accurate, but
              requirements, forms, and deadlines change; always verify with the relevant agency
              before filing or paying anything.
            </p>
          ),
        },
        {
          id: "your-account",
          title: "Your account",
          children: (
            <p>
              You&apos;re responsible for the accuracy of the information you enter and for keeping
              your login credentials secure. Demo accounts are sandboxed and may be reset at any
              time.
            </p>
          ),
        },
        {
          id: "premium",
          title: "Premium",
          children: (
            <p>
              Upgrading to Premium in this version of the app is simulated: no payment is taken, and
              no real subscription is created.
              {siteConfig.premiumPriceLabel ? ` Premium pricing: ${siteConfig.premiumPriceLabel}.` : ""}
            </p>
          ),
        },
        {
          id: "liability",
          title: "Limitation of liability",
          children: (
            <p>
              GabayNegosyo is provided as-is, without warranty of any kind. We are not liable for
              penalties, missed deadlines, or other consequences arising from reliance on this app in
              place of official sources or professional advice.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          children: (
            <p>
              {siteConfig.contactEmail ? (
                <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
              ) : (
                "Contact address not yet configured"
              )}
              .
            </p>
          ),
        },
      ]}
    />
  );
}
