import type { Requirement } from "./types";
/** Selection only: applicability and deadlines stay in the existing rule engine. */
export function isRenewalRequirement(req: Requirement) {
  return /renewal|renew\b/i.test(`${req.name} ${req.complianceStage ?? ""}`);
}
export function renewalStepState(instructions: string[], done: number[]) {
  const completed = new Set(done.filter(index => Number.isInteger(index) && index >= 0 && index < instructions.length));
  const first = instructions.findIndex((_, index) => !completed.has(index));
  return { completed, count: completed.size, firstIncomplete: first < 0 ? 0 : first, allDone: instructions.length > 0 && completed.size === instructions.length };
}
export function isOutlineRenewal(req: Requirement) {
  return req.contentSource === "prototype_placeholder" || req.instructions.length === 0 || req.instructions.every(step => /^(Review the requirement with the responsible|Prepare the required documents listed in|Complete the official application or filing)/.test(step));
}
