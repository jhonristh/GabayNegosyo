import type { AnalyticsEvent } from "./types";

/**
 * ANALYTICS (V0.2 §31)
 * ────────────────────
 * Event architecture prepared for a future Supabase-backed system. In
 * demo/local mode events are appended to localStorage only — they never
 * leave the device, and the admin dashboard aggregates them rather than
 * listing them per user.
 *
 * Privacy: `metadata` must never carry personally identifying information.
 * Record IDs and enum-like values (business type, agency id, status), not
 * names, emails, or free text the user typed.
 */
export type AnalyticsEventType =
  | "user_signed_up"
  | "wizard_started"
  | "wizard_completed"
  | "requirement_viewed"
  | "requirement_completed"
  | "resource_searched"
  | "tutorial_viewed"
  | "premium_viewed"
  | "penalty_simulator_used"
  | "reminder_created";

const EVENTS_KEY = "gn_events_v1";
const MAX_EVENTS = 500; // bounded so localStorage can't grow without limit

function readEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

export function track(
  eventType: AnalyticsEventType,
  metadata: Record<string, unknown> = {},
  userId = "anonymous"
): void {
  if (typeof window === "undefined") return;
  try {
    const events = readEvents();
    events.unshift({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      eventType,
      metadata,
      createdAt: new Date().toISOString(),
    });
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    // Analytics must never break a user flow.
  }
}

export function getEvents(): AnalyticsEvent[] {
  return readEvents();
}

/** Aggregate counts by event type — what the admin dashboard displays. */
export function countByType(): Record<string, number> {
  return readEvents().reduce<Record<string, number>>((acc, e) => {
    acc[e.eventType] = (acc[e.eventType] ?? 0) + 1;
    return acc;
  }, {});
}

/** Aggregate counts for a single metadata key (e.g. which agency is viewed most). */
export function countByMetadataKey(eventType: AnalyticsEventType, key: string): Record<string, number> {
  return readEvents()
    .filter((e) => e.eventType === eventType)
    .reduce<Record<string, number>>((acc, e) => {
      const value = e.metadata?.[key];
      if (typeof value === "string") acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});
}

export function topEntry(counts: Record<string, number>): { key: string; count: number } | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  const [key, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return { key, count };
}
