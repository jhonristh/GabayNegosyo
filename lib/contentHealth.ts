import type { Requirement, ResourceItem, Tutorial } from "./types";

/**
 * CONTENT HEALTH
 * ──────────────
 * Every metric here is COMPUTED from fields that already exist on the data
 * (contentSource, deadlineDescription, penaltyRule, isPlaceholder,
 * lastVerified) — never a hand-authored editorial judgment. This keeps the
 * "needs review" signal honest: it reflects what the source material
 * actually did or didn't specify, not an opinion layered on top of it.
 *
 * Penalty rate being `not_specified` is NOT treated as a review flag here:
 * the client-provided workbook never gave penalty rates for almost any of
 * the BIR requirements, so that field being unset is the expected, by-design
 * state for nearly the whole dataset (see CONTENT_AUDIT.md) — flagging it
 * would just be noise. What IS flagged is a requirement whose deadline text
 * itself says it's an approximation, since that's the concrete gap a reader
 * should know about before relying on the date shown.
 */

export type ContentStatus = "workbook_verified" | "needs_review" | "placeholder";

const APPROX_MARKERS = ["not specified", "approximat"];

export function requirementContentStatus(req: Requirement): ContentStatus {
  if (req.contentSource === "prototype_placeholder") return "placeholder";
  const deadline = (req.deadlineDescription ?? "").toLowerCase();
  if (APPROX_MARKERS.some((m) => deadline.includes(m))) return "needs_review";
  return "workbook_verified";
}

const STALE_DAYS = 180;

export function isResourceStale(resource: ResourceItem, today: Date = new Date()): boolean {
  if (!resource.lastVerified) return true;
  const verified = new Date(resource.lastVerified);
  if (Number.isNaN(verified.getTime())) return true;
  const days = (today.getTime() - verified.getTime()) / (1000 * 60 * 60 * 24);
  return days > STALE_DAYS;
}

export interface ContentHealthSummary {
  requirements: {
    total: number;
    bySource: Record<string, number>;
    needsReview: number;
    placeholder: number;
  };
  tutorials: {
    total: number;
    placeholders: number;
  };
  resources: {
    total: number;
    stale: number;
    missingVerifiedDate: number;
  };
}

export function computeContentHealth(
  requirements: Requirement[],
  resources: ResourceItem[],
  tutorials: Tutorial[],
  today: Date = new Date()
): ContentHealthSummary {
  const bySource: Record<string, number> = {};
  let needsReview = 0;
  let placeholder = 0;
  for (const req of requirements) {
    bySource[req.contentSource] = (bySource[req.contentSource] ?? 0) + 1;
    const status = requirementContentStatus(req);
    if (status === "needs_review") needsReview += 1;
    if (status === "placeholder") placeholder += 1;
  }

  return {
    requirements: { total: requirements.length, bySource, needsReview, placeholder },
    tutorials: {
      total: tutorials.length,
      placeholders: tutorials.filter((t) => t.isPlaceholder).length,
    },
    resources: {
      total: resources.length,
      stale: resources.filter((r) => isResourceStale(r, today)).length,
      missingVerifiedDate: resources.filter((r) => !r.lastVerified).length,
    },
  };
}
