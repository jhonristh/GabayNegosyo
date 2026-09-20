"use client";

import { useMemo, useState } from "react";
import AuthGuard from "../../components/AuthGuard";
import SearchBar from "../../components/SearchBar";
import { db } from "../../lib/db";
import type { ResourceType } from "../../lib/types";

const TYPES: ResourceType[] = ["form", "guide", "tutorial", "official_website", "requirement", "document"];

export default function ResourcesPage() {
  const resources = useMemo(() => db.getResources(), []);
  const agencies = useMemo(() => db.getAgencies(), []);
  const [query, setQuery] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ResourceType>("all");
  const [sortBy, setSortBy] = useState<"title" | "lastVerified">("title");

  const results = resources
    .filter((r) => (agencyFilter === "all" ? true : r.agencyId === agencyFilter))
    .filter((r) => (typeFilter === "all" ? true : r.resourceType === typeFilter))
    .filter((r) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    })
    .sort((a, b) => (sortBy === "title" ? a.title.localeCompare(b.title) : b.lastVerified.localeCompare(a.lastVerified)));

  return (
    <AuthGuard>
      <main className="screen">
        <header className="intro">
          <h1>Resource library</h1>
          <p>Search forms, guides, tutorials, and official resources.</p>
        </header>

        <SearchBar value={query} onChange={setQuery} placeholder="Search resources…" />

        <div className="filter-row">
          <select className="text-input" value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)}>
            <option value="all">All agencies</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id.toUpperCase()}
              </option>
            ))}
          </select>
          <select className="text-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ResourceType | "all")}>
            <option value="all">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select className="text-input" value={sortBy} onChange={(e) => setSortBy(e.target.value as "title" | "lastVerified")}>
            <option value="title">Sort: A–Z</option>
            <option value="lastVerified">Sort: recently verified</option>
          </select>
        </div>

        <p className="hint">{results.length} result(s)</p>

        {results.map((r) => (
          <article key={r.id} className="checklist-card">
            <span className="req-agency-tag">{r.resourceType.replace(/_/g, " ")}</span>
            <h3>{r.title}</h3>
            <p className="docs">{r.description}</p>
            <a href={r.url} target="_blank" rel="noreferrer" className="tutorial-link">
              Open resource
            </a>
            <p className="verified">Last verified: {r.lastVerified}</p>
          </article>
        ))}
      </main>
    </AuthGuard>
  );
}
