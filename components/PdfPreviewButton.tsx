"use client";

import { useEffect, useRef, useState } from "react";
import { isPreviewablePdf } from "../lib/pdfPreview";

/**
 * "Preview form" button that opens the official PDF in a modal dialog, with the source
 * link always available. Renders nothing when the URL is not a previewable official PDF.
 */
export default function PdfPreviewButton({ url, title, label = "Preview form" }: { url: string | null | undefined; title: string; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);

  if (!isPreviewablePdf(url)) return null;

  return (
    <>
      <button type="button" className="secondary-btn" onClick={() => setOpen(true)}>
        {label}
      </button>
      <dialog ref={dialog} className="v06-preview-dialog" onClose={() => setOpen(false)} aria-label={`Preview ${title}`}>
        <div className="v06-dialog-header">
          <div>
            <p className="v06-eyebrow">BIR · OFFICIAL PDF</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="v06-close" onClick={() => dialog.current?.close()} aria-label="Close preview">
            ×
          </button>
        </div>
        <div className="v06-pdf-wrap">
          <iframe src={`${url}#toolbar=0`} title={`PDF preview of ${title}`} loading="lazy" />
          <p>If the PDF does not display on your device, open it from the official source.</p>
        </div>
        <div className="v06-dialog-actions">
          <a className="primary-btn" href={url} target="_blank" rel="noopener noreferrer">
            Open official PDF ↗
          </a>
          <button type="button" className="secondary-btn" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
