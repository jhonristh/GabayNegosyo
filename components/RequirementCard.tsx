import Link from "next/link";
import type { Requirement, RequirementStatus } from "../lib/types";
import StatusBadge from "./StatusBadge";

export default function RequirementCard({
  requirement,
  status,
  dueLabel,
  agencyName,
}: {
  requirement: Requirement;
  status: RequirementStatus;
  dueLabel: string;
  agencyName: string;
}) {
  return (
    <Link href={`/requirements/${requirement.id}`} className="req-card">
      <div className="req-card-top">
        <span className="req-agency-tag">{agencyName}</span>
        <StatusBadge status={status} />
      </div>
      <h3>{requirement.name}</h3>
      <p className="req-due">Due: {dueLabel}</p>
    </Link>
  );
}
