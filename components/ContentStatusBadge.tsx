import type { ContentStatus } from "../lib/contentHealth";

const LABELS: Record<ContentStatus, string> = {
  workbook_verified: "Workbook-sourced",
  needs_review: "Needs review",
  placeholder: "Prototype placeholder",
};

/**
 * Content health indicator (WP14). Status is computed from real fields
 * (contentSource, deadlineDescription — see lib/contentHealth.ts), never
 * hand-set, so nobody mistakes an approximated deadline or placeholder
 * content for confirmed official guidance.
 */
export default function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return <span className={`content-badge content-badge-${status}`}>{LABELS[status]}</span>;
}
