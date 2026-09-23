"use client";

import { useEffect, useRef, useState } from "react";
import type { ResourceItem } from "../lib/types";

export default function FormPreviewCard({ resource }: { resource: ResourceItem }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pdf = /^https:\/\/(bir-cdn\.bir\.gov\.ph)\//.test(resource.url) && /\.pdf(?:$|[?#])/i.test(resource.url);
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);
  return <article className="v06-media-card">
    <div className="v06-document-art" aria-hidden="true"><span>{resource.agencyId.toUpperCase()} · FORM</span><strong>{resource.title.match(/(?:Form\s+)([\w-]+)/i)?.[1] ?? "FORM"}</strong><i /><i /><i /></div>
    <div className="v06-media-content"><p className="v06-eyebrow">{resource.agencyId.toUpperCase()} · FORM</p><h3>{resource.title}</h3><p>{resource.description}</p><div className="v06-card-actions">
      {pdf && <button type="button" className="secondary-btn" onClick={() => setOpen(true)}>Preview form</button>}
      <a className="tutorial-link" href={resource.url} target="_blank" rel="noopener noreferrer">{pdf ? "Open official PDF ↗" : "Open source ↗"}</a>
    </div><p className="verified">Source checked: {resource.lastVerified}</p></div>
    {pdf && <dialog ref={dialog} className="v06-preview-dialog" onClose={() => setOpen(false)} aria-label={`Preview ${resource.title}`}>
      <div className="v06-dialog-header"><div><p className="v06-eyebrow">{resource.agencyId.toUpperCase()} · OFFICIAL PDF</p><h2>{resource.title}</h2></div><button type="button" className="v06-close" onClick={() => dialog.current?.close()} aria-label="Close preview">×</button></div>
      <div className="v06-pdf-wrap"><iframe src={`${resource.url}#toolbar=0`} title={`PDF preview of ${resource.title}`} loading="lazy" /><p>If the PDF does not display on your device, open it from the official source.</p></div>
      <div className="v06-dialog-actions"><a className="primary-btn" href={resource.url} target="_blank" rel="noopener noreferrer">Open official PDF ↗</a><button type="button" className="secondary-btn" onClick={() => dialog.current?.close()}>Close</button></div>
    </dialog>}
  </article>;
}
