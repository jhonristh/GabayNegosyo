"use client";

import { useState } from "react";
import AdminGuard from "../../../components/AdminGuard";
import { db } from "../../../lib/db";
import type { Agency } from "../../../lib/types";

function AgenciesInner() {
  const [agencies, setAgencies] = useState<Agency[]>(() => db.getAgencies());
  const [newAgency, setNewAgency] = useState({ id: "", name: "", description: "", officialUrl: "" });

  function refresh() {
    setAgencies(db.getAgencies());
  }

  function save(agency: Agency) {
    db.upsertAgency(agency);
    refresh();
  }

  function archive(id: string) {
    db.archiveAgency(id);
    refresh();
  }

  function addNew() {
    if (!newAgency.id || !newAgency.name) return;
    db.upsertAgency({ ...newAgency });
    setNewAgency({ id: "", name: "", description: "", officialUrl: "" });
    refresh();
  }

  return (
    <main className="screen admin-screen">
      <header className="intro">
        <h1>Manage agencies</h1>
      </header>

      <section className="admin-add-form">
        <h2>Add new agency</h2>
        <input className="text-input" placeholder="id (e.g. dti)" value={newAgency.id} onChange={(e) => setNewAgency({ ...newAgency, id: e.target.value })} />
        <input className="text-input" placeholder="Name" value={newAgency.name} onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })} />
        <input className="text-input" placeholder="Description" value={newAgency.description} onChange={(e) => setNewAgency({ ...newAgency, description: e.target.value })} />
        <input className="text-input" placeholder="Official URL" value={newAgency.officialUrl} onChange={(e) => setNewAgency({ ...newAgency, officialUrl: e.target.value })} />
        <button type="button" className="primary-btn" onClick={addNew}>
          Add agency
        </button>
      </section>

      {agencies.map((a) => (
        <article key={a.id} className="checklist-card admin-row">
          <input className="text-input" value={a.name} onChange={(e) => save({ ...a, name: e.target.value })} />
          <input className="text-input" value={a.description} onChange={(e) => save({ ...a, description: e.target.value })} />
          <input className="text-input" value={a.officialUrl} onChange={(e) => save({ ...a, officialUrl: e.target.value })} />
          <button type="button" className="secondary-btn" onClick={() => archive(a.id)}>
            Archive
          </button>
        </article>
      ))}
    </main>
  );
}

export default function AgenciesAdminPage() {
  return (
    <AdminGuard>
      <AgenciesInner />
    </AdminGuard>
  );
}
