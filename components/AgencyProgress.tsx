import type { Agency } from "../lib/types";

/**
 * Growth Ledger "Progress by agency" panel.
 *
 * Bars are computed from the person's real applicable requirements (the same
 * list the checklist uses); nothing here is a sample figure. Every bar has a
 * printed "done/total" so meaning never depends on bar height or color alone,
 * and the whole chart is summarised in one aria-label sentence for screen readers.
 */

const SHORT_NAMES: Record<string, string> = {
  bir: "BIR",
  sss: "SSS",
  philhealth: "PhilHealth",
  pagibig: "Pag-IBIG",
  lgu: "LGU",
};

export function agencyShortName(agency: Pick<Agency, "id" | "name">): string {
  return SHORT_NAMES[agency.id] ?? agency.id.toUpperCase();
}

export interface AgencyProgressRow {
  id: string;
  label: string;
  done: number;
  total: number;
}

export function buildAgencyProgress(
  agencies: Pick<Agency, "id" | "name">[],
  items: { req: { agencyId: string }; status: string }[]
): AgencyProgressRow[] {
  return agencies.map((agency) => {
    const mine = items.filter((item) => item.req.agencyId === agency.id);
    return {
      id: agency.id,
      label: agencyShortName(agency),
      done: mine.filter((item) => item.status === "completed").length,
      total: mine.length,
    };
  });
}

export default function AgencyProgress({ rows }: { rows: AgencyProgressRow[] }) {
  const summary = rows
    .map((row) => (row.total ? `${row.label}: ${row.done} of ${row.total} completed` : `${row.label}: no items for your profile`))
    .join("; ");

  return (
    <section className="kit-panel kit-agency" aria-labelledby="kit-agency-title">
      <h2 id="kit-agency-title">Progress by agency</h2>
      <ul className="kit-bars" aria-label={summary}>
        {rows.map((row) => {
          const percent = row.total ? Math.round((row.done / row.total) * 100) : 0;
          return (
            <li key={row.id}>
              <span className="kit-bar" aria-hidden="true">
                <i style={{ height: `${percent}%` }} />
              </span>
              <b>{row.label}</b>
              <small>{row.total ? `${row.done}/${row.total}` : "None"}</small>
            </li>
          );
        })}
      </ul>
      <p className="hint">Counts cover the requirements that apply to your business profile.</p>
    </section>
  );
}
