"use client";

import { useState } from "react";
import AdminGuard from "../../../components/AdminGuard";
import { db } from "../../../lib/db";
import type { ResourceItem, ResourceType } from "../../../lib/types";

const TYPES: ResourceType[] = ["form", "guide", "tutorial", "official_website", "requirement", "document"];

function ResourcesInner() {
  const [resources, setResources] = useState<ResourceItem[]>(() => db.getResources());
  const agencies = db.getAgencies();
  const [draft, setDraft] = useState<Partial<ResourceItem>>({ resourceType: "guide", agencyId: agencies[0]?.id });

  function refresh() {
    setResources(db.getResources());
  }

  function save(item: ResourceItem) {
    db.upsertResource(item);
    refresh();
  }

  function archive(id: string) {
    db.archiveResource(id);
    refresh();
  }

  function addNew() {
    if (!draft.id || !draft.title || !draft.url) return;
    save({
      id: draft.id,
      title: draft.title,
      url: draft.url,
      description: draft.description ?? "",
      resourceType: (draft.resourceType as ResourceType) ?? "guide",
      agencyId: draft.agencyId ?? agencies[0]?.id ?? "",
      lastVerified: new Date().toISOString().slice(0, 10),
    });
    setDraft({ resourceType: "guide", agencyId: agencies[0]?.id });
  }

  return (
    <main className="screen admin-screen">
      <header className="intro">
        <h1>Manage resources</h1>
      </header>

      <section className="admin-add-form">
        <h2>Add new resource</h2>
        <input className="text-input" placeholder="id" value={draft.id ?? ""} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
        <input className="text-input" placeholder="Title" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input className="text-input" placeholder="URL" value={draft.url ?? ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
        <input className="text-input" placeholder="Description" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <select className="text-input" value={draft.resourceType} onChange={(e) => setDraft({ ...draft, resourceType: e.target.value as ResourceType })}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className="text-input" value={draft.agencyId} onChange={(e) => setDraft({ ...draft, agencyId: e.target.value })}>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.id.toUpperCase()}
            </option>
          ))}
        </select>
        <button type="button" className="primary-btn" onClick={addNew}>
          Add resource
        </button>
      </section>

      {resources.map((r) => (
        <article key={r.id} className="checklist-card admin-row">
          <input className="text-input" value={r.title} onChange={(e) => save({ ...r, title: e.target.value })} />
          <input className="text-input" value={r.url} onChange={(e) => save({ ...r, url: e.target.value })} />
          <input className="text-input" value={r.lastVerified} onChange={(e) => save({ ...r, lastVerified: e.target.value })} />
          <button type="button" className="secondary-btn" onClick={() => archive(r.id)}>
            Archive
          </button>
        </article>
      ))}
    </main>
  );
}

export default function ResourcesAdminPage() {
  return (
    <AdminGuard>
      <ResourcesInner />
    </AdminGuard>
  );
}
