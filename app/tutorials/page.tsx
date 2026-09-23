"use client";

import { useMemo, useState } from "react";
import TutorialCard from "../../components/TutorialCard";
import AuthGuard from "../../components/AuthGuard";
import { db } from "../../lib/db";

export default function TutorialsPage() {
  const tutorials = useMemo(() => db.getTutorials(), []);
  const agencies = useMemo(() => db.getAgencies(), []);
  const [agencyFilter, setAgencyFilter] = useState<string>("all");

  const filtered = agencyFilter === "all" ? tutorials : tutorials.filter((t) => t.agencyId === agencyFilter);
  const grouped = filtered.reduce<Record<string, typeof tutorials>>((acc, t) => {
    if (!acc[t.agencyId]) acc[t.agencyId] = [];
    acc[t.agencyId].push(t);
    return acc;
  }, {});

  return (
    <AuthGuard>
      <main className="screen v06-library">
        <header className="intro">
          <h1>Learning hub</h1>
          <p>Step-by-step guides and curated videos for every requirement.</p>
        </header>

        <div className="filter-row">
          <button type="button" className={`filter-chip ${agencyFilter === "all" ? "selected" : ""}`} onClick={() => setAgencyFilter("all")}>
            All agencies
          </button>
          {agencies.map((a) => (
            <button key={a.id} type="button" className={`filter-chip ${agencyFilter === a.id ? "selected" : ""}`} onClick={() => setAgencyFilter(a.id)}>
              {a.id.toUpperCase()}
            </button>
          ))}
        </div>

        {filtered.length === 0 && <p className="v06-unavailable">No tutorials are available for this agency yet.</p>}
        {Object.entries(grouped).map(([agencyId, items]) => {
          const agency = agencies.find((a) => a.id === agencyId);
          return (
            <section key={agencyId} className="agency-group">
              <h2>{agency?.name ?? agencyId}</h2>
              <div className="v06-media-grid">{items.map((t) => <TutorialCard key={t.id} tutorial={t} />)}</div>
            </section>
          );
        })}
      </main>
    </AuthGuard>
  );
}
