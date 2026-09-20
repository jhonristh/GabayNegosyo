import type { RequirementStatus } from "../lib/types";

const LABELS: Record<RequirementStatus, string> = {
  upcoming: "Upcoming",
  due_soon: "Due soon",
  overdue: "Overdue",
  completed: "Completed",
};

export default function StatusBadge({ status }: { status: RequirementStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
