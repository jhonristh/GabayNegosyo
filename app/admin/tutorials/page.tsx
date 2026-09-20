"use client";

import { useState } from "react";
import AdminGuard from "../../../components/AdminGuard";
import { db } from "../../../lib/db";
import type { Tutorial } from "../../../lib/types";

function TutorialsInner() {
  const [tutorials, setTutorials] = useState<Tutorial[]>(() => db.getTutorials());
  const agencies = db.getAgencies();
  const [draft, setDraft] = useState<Partial<Tutorial>>({ category: "registration", agencyId: agencies[0]?.id, isPlaceholder: true });

  function refresh() {
    setTutorials(db.getTutorials());
  }

  function save(t: Tutorial) {
    db.upsertTutorial(t);
    refresh();
  }

  function archive(id: string) {
    db.archiveTutorial(id);
    refresh();
  }

  function addNew() {
    if (!draft.id || !draft.title || !draft.videoUrl) return;
    save({
      id: draft.id,
      title: draft.title,
      videoUrl: draft.videoUrl,
      description: draft.description ?? "",
      agencyId: draft.agencyId ?? agencies[0]?.id ?? "",
      category: (draft.category as Tutorial["category"]) ?? "registration",
      isPlaceholder: draft.isPlaceholder ?? true,
    });
    setDraft({ category: "registration", agencyId: agencies[0]?.id, isPlaceholder: true });
  }

  return (
    <main className="screen admin-screen">
      <header className="intro">
        <h1>Manage tutorials</h1>
      </header>

      <section className="admin-add-form">
        <h2>Add new tutorial</h2>
        <input className="text-input" placeholder="id" value={draft.id ?? ""} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
        <input className="text-input" placeholder="Title" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input className="text-input" placeholder="Video URL" value={draft.videoUrl ?? ""} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} />
        <input className="text-input" placeholder="Description" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <select className="text-input" value={draft.agencyId} onChange={(e) => setDraft({ ...draft, agencyId: e.target.value })}>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.id.toUpperCase()}
            </option>
          ))}
        </select>
        <button type="button" className="primary-btn" onClick={addNew}>
          Add tutorial
        </button>
      </section>

      {tutorials.map((t) => (
        <article key={t.id} className="checklist-card admin-row">
          <input className="text-input" value={t.title} onChange={(e) => save({ ...t, title: e.target.value })} />
          <input className="text-input" value={t.videoUrl} onChange={(e) => save({ ...t, videoUrl: e.target.value })} />
          <button type="button" className="secondary-btn" onClick={() => archive(t.id)}>
            Archive
          </button>
        </article>
      ))}
    </main>
  );
}

export default function TutorialsAdminPage() {
  return (
    <AdminGuard>
      <TutorialsInner />
    </AdminGuard>
  );
}
