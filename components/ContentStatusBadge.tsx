import type { ContentStatus } from "../lib/types";

const LABELS: Record<ContentStatus, string> = {
  verified: "Verified",
  review_required: "Review required",
  prototype: "Prototype content",
  archived: "Archived",
};

/**
 * Content health indicator (V0.2 §22). Government compliance information
 * changes over time, so every requirement/resource/tutorial carries a
 * status. This is shown to admins on every CRUD row, and surfaced to users
 * on requirement detail so nobody mistakes unconfirmed prototype content
 * for verified official guidance.
 */
export default function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return <span className={`content-badge content-badge-${status}`}>{LABELS[status]}</span>;
}
