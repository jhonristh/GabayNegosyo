"use client";

import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import FilingTutorialVideos from "../../components/FilingTutorialVideos";
import { JourneyHeader, JourneyNext } from "../../components/JourneyStepper";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import guide from "../../data/clientGuide.json";

const SECTIONS = [
  { stage: "Renew an existing business", title: "Renewal requirements" },
  { stage: "Keep operating", title: "Post-registration compliance" },
];

function RenewalContent() {
  const { user } = useAuth();
  const profile = user ? db.getBusinessProfile(user.id) : null;
  const premium = user?.role === "premium" || user?.role === "admin";
  const visible = guide.filter((i) => i.audience !== "employees" || profile?.hasEmployees !== false);

  return (
    <main className="screen client-guide">
      <JourneyHeader
        current="renewal"
        title="Renewal & Post-Registration"
        intro="Keep your business compliant after registration: renew on time, file regularly, and keep your records current."
      />

      <div className="guide-note">
        <strong>About dates</strong>
        <p>Local due dates, monthly remittances, and event-based filings need individual confirmation. Check the issuing agency before filing or paying. See your <Link href="/deadlines">deadlines</Link> for the dates on your checklist.</p>
      </div>

      {SECTIONS.map(({ stage, title }) => {
        const items = visible.filter((i) => i.stage === stage);
        return items.length ? (
          <section className="guide-stage" key={stage}>
            <h2>{title}</h2>
            <div className="guide-grid">
              {items.map((item) => (
                <article className="guide-card" key={item.id}>
                  <p className="v06-eyebrow">{item.agency}</p>
                  <h3>{item.title}</h3>
                  <p>{item.timing}</p>
                  {premium ? (
                    <>
                      <h4>What to prepare</h4>
                      <ul>{item.documents.map((d) => <li key={d}>{d}</li>)}</ul>
                      <h4>Steps</h4>
                      <ol>{item.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                    </>
                  ) : (
                    <p className="guide-locked">Premium shows the document list and action steps. <Link href="/account">View your plan</Link></p>
                  )}
                  {item.officialUrl && <a href={item.officialUrl} target="_blank" rel="noopener noreferrer">Visit agency ↗</a>}
                  <small>Client reference: {item.source}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null;
      })}

      <FilingTutorialVideos />

      <JourneyNext current="renewal" />
    </main>
  );
}

export default function RenewalPage() {
  return <AuthGuard><RenewalContent /></AuthGuard>;
}
