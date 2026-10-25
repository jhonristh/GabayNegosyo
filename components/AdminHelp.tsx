import type { ReactNode } from "react";

/**
 * Instructions panel for the admin editors.
 *  - children: a short plain-language summary of the page.
 *  - steps: numbered how-to steps for this page (shown in order).
 *  - warnings: things that can break the public site or cannot be undone.
 * Every admin page shows the storage note, so nobody assumes edits are shared or published.
 */
export default function AdminHelp({
  children,
  steps,
  warnings,
  title = "How to use this page",
  storageNote = true,
}: {
  children?: ReactNode;
  steps?: string[];
  warnings?: string[];
  title?: string;
  /** Set false on pages that do not edit browser-saved content (e.g. the read-only Users list). */
  storageNote?: boolean;
}) {
  return (
    <aside className="admin-help" role="note" aria-label={title}>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {steps && steps.length > 0 && (
        <ol className="admin-help-steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      {warnings && warnings.length > 0 && (
        <div className="admin-help-warnings">
          <p className="admin-help-warn-title">Before you change anything</p>
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {storageNote && (
        <p className="hint">
          Content changes (agencies, requirements, resources, tutorials) are saved in this browser only. They do not publish to other users or update Supabase. Check the official source before sharing any information.
        </p>
      )}
    </aside>
  );
}
