import type { RequirementStatus } from "../lib/types";
import StatusIcon from "./StatusIcon";

const LABELS: Record<RequirementStatus, string> = {
  upcoming: "Upcoming",
  due_soon: "Due soon",
  due_today: "Due today",
  overdue: "Overdue",
  completed: "Completed",
};

/**
 * Status is never color alone: shape (StatusIcon, hand-written SVG — see
 * K11 in docs/V0.3_STATUS.md) plus color plus a text label together.
 */
export default function StatusBadge({ status }: { status: RequirementStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-icon">
        <StatusIcon status={status} />
      </span>
      {LABELS[status]}
    </span>
  );
}
