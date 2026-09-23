"use client";

import { useMemo, useState } from "react";
import AuthGuard from "../../components/AuthGuard";
import SearchBar from "../../components/SearchBar";
import FormPreviewCard from "../../components/FormPreviewCard";
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
      <main className="screen v06-library">
        <header className="intro">
          <h1>Resource library</h1>
          <p>Search forms, guides, tutorials, and official resources.</p>
        </header>

        <SearchBar value={query} onChange={setQuery} placeholder="Search resources…" />

        <div className="filter-row">
          <select aria-label="Filter or sort resources" className="text-input" value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)}>
            <option value="all">All agencies</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id.toUpperCase()}
              </option>
            ))}
          </select>
          <select aria-label="Filter or sort resources" className="text-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ResourceType | "all")}>
            <option value="all">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select aria-label="Filter or sort resources" className="text-input" value={sortBy} onChange={(e) => setSortBy(e.target.value as "title" | "lastVerified")}>
            <option value="title">Sort: A–Z</option>
            <option value="lastVerified">Sort: recently verified</option>
          </select>
        </div>

        <p className="hint">{results.length} result(s)</p>

        {results.length === 0 && <p className="v06-unavailable">No resources match these filters. Try another search or agency.</p>}
        <div className="v06-media-grid">{results.map((r) => r.resourceType === "form" ? <FormPreviewCard key={r.id} resource={r} /> :
          <article key={r.id} className="v06-media-card"><div className="v06-resource-art" aria-hidden="true">{r.resourceType.replace(/_/g, " ")}</div><div className="v06-media-content"><p className="v06-eyebrow">{r.agencyId.toUpperCase()} · {r.resourceType.replace(/_/g, " ")}</p><h3>{r.title}</h3><p>{r.description}</p><a href={r.url} target="_blank" rel="noopener noreferrer" className="tutorial-link">Open source ↗</a><p className="verified">Source checked: {r.lastVerified}</p></div></article>
        )}</div>
      </main>
    </AuthGuard>
  );
}
