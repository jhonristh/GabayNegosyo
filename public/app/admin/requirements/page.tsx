"use client";

import { useState } from "react";
import AdminGuard from "../../../components/AdminGuard";
import { db } from "../../../lib/db";
import type { Requirement } from "../../../lib/types";

const BLANK_REQUIREMENT: Requirement = {
  id: "",
  agencyId: "bir",
  name: "",
  description: "",
  whoItAppliesTo: "",
  applicabilityRules: {},
  requiredDocuments: [],
  instructions: [],
  deadlineDescription: "",
  deadlineMonth: 1,
  deadlineDay: 1,
  penaltyRule: { type: "flat_plus_daily", flatAmount: 0, description: "" },
  officialUrl: "",
  lastVerified: new Date().toISOString().slice(0, 10),
};

function RequirementsInner() {
  const [requirements, setRequirements] = useState<Requirement[]>(() => db.getRequirements());
  const agencies = db.getAgencies();
  const [draft, setDraft] = useState<string>(JSON.stringify(BLANK_REQUIREMENT, null, 2));
  const [error, setError] = useState("");

  function refresh() {
    setRequirements(db.getRequirements());
  }

  function updateField(req: Requirement, field: keyof Requirement, value: string) {
    db.upsertRequirement({ ...req, [field]: value });
    refresh();
  }

  function archive(id: string) {
    db.archiveRequirement(id);
    refresh();
  }

  function addFromJson() {
    try {
      const parsed = JSON.parse(draft) as Requirement;
      if (!parsed.id || !parsed.name) {
        setError("id and name are required.");
        return;
      }
      db.upsertRequirement(parsed);
      setDraft(JSON.stringify(BLANK_REQUIREMENT, null, 2));
      setError("");
      refresh();
    } catch {
      setError("Invalid JSON — check the structure and try again.");
    }
  }

  return (
    <main className="screen admin-screen">
      <header className="intro">
        <h1>Manage requirements</h1>
        <p className="hint">
          Edit name, deadline label, official URL, and last-verified date inline. For structured
          fields (documents, instructions, applicability, penalty), use the JSON form below —
          this keeps the editable schema exactly aligned with database/schema.sql.
        </p>
      </header>

      <section className="admin-add-form">
        <h2>Add / update via JSON</h2>
        <textarea className="text-input admin-json" rows={14} value={draft} onChange={(e) => setDraft(e.target.value)} />
        {error && <p className="penalty">{error}</p>}
        <button type="button" className="primary-btn" onClick={addFromJson}>
          Save requirement
        </button>
      </section>

      {requirements.map((r) => (
        <article key={r.id} className="checklist-card admin-row">
          <select className="text-input" value={r.agencyId} onChange={(e) => updateField(r, "agencyId", e.target.value)}>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id.toUpperCase()}
              </option>
            ))}
          </select>
          <input className="text-input" value={r.name} onChange={(e) => updateField(r, "name", e.target.value)} />
          <input className="text-input" value={r.deadlineDescription} onChange={(e) => updateField(r, "deadlineDescription", e.target.value)} />
          <input className="text-input" value={r.officialUrl} onChange={(e) => updateField(r, "officialUrl", e.target.value)} />
          <input className="text-input" value={r.lastVerified} onChange={(e) => updateField(r, "lastVerified", e.target.value)} />
          <button type="button" className="secondary-btn" onClick={() => archive(r.id)}>
            Archive
          </button>
        </article>
      ))}
    </main>
  );
}

export default function RequirementsAdminPage() {
  return (
    <AdminGuard>
      <RequirementsInner />
    </AdminGuard>
  );
}
