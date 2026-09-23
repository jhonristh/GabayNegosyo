import agenciesSeed from "../data/agencies.json";
import requirementsSeed from "../data/requirements.json";
import resourcesSeed from "../data/resources.json";
import tutorialsSeed from "../data/tutorials.json";
import { getSupabase } from "./supabase";
import type {
  Agency,
  Requirement,
  ResourceItem,
  Tutorial,
  BusinessProfile,
  ChecklistItem,
  ReminderConfig,
  SentEmail,
} from "./types";

/**
 * DATA / SERVICE LAYER  (Supabase-backed user data)
 * ─────────────────────────────────────────────────
 * The UI still talks to this one object and still reads synchronously.
 * What changed under the hood:
 *
 *  USER DATA  (business profile, checklist progress, reminders, sent emails)
 *    - Lives in Supabase (tables protected by Row Level Security).
 *    - db.hydrate(userId) loads it into an in-memory cache right after login
 *      (lib/auth.tsx calls this), so reads below stay synchronous.
 *    - Every write updates the cache immediately AND is sent to Supabase
 *      (write-through). Failures are logged to the console.
 *    - db.clearUserData() empties the cache on logout.
 *
 *  CONTENT  (agencies, requirements, resources, tutorials + admin edits)
 *    - Unchanged for now: seed JSON in /data plus admin overrides in this
 *      browser's localStorage. Moving this to Supabase tables is the next
 *      stage — see docs/SUPABASE_SETUP.md, "What is still local".
 */

const STORE_KEY = "gn_store_v1";

/** localStorage store — now ONLY holds admin content overrides. */
interface Store {
  adminOverrides: {
    agencies: Record<string, Partial<Agency>>;
    requirements: Record<string, Partial<Requirement>>;
    resources: Record<string, Partial<ResourceItem>>;
    tutorials: Record<string, Partial<Tutorial>>;
    createdRequirements: Requirement[];
    createdResources: ResourceItem[];
    createdTutorials: Tutorial[];
    createdAgencies: Agency[];
  };
}

function emptyStore(): Store {
  return {
    adminOverrides: {
      agencies: {},
      requirements: {},
      resources: {},
      tutorials: {},
      createdRequirements: [],
      createdResources: [],
      createdTutorials: [],
      createdAgencies: [],
    },
  };
}

function readStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    return { adminOverrides: { ...emptyStore().adminOverrides, ...parsed.adminOverrides } };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

/** In-memory copy of the signed-in user's rows from Supabase. */
interface UserData {
  businessProfile: BusinessProfile | null;
  checklistProgress: Record<string, ChecklistItem>;
  reminderConfigs: Record<string, ReminderConfig>;
  sentEmails: SentEmail[];
}

function emptyUserData(): UserData {
  return { businessProfile: null, checklistProgress: {}, reminderConfigs: {}, sentEmails: [] };
}

let currentUserId: string | null = null;
let userData: UserData = emptyUserData();

/** Fire-and-forget a Supabase write; log instead of crashing the UI if it fails. */
function persist(label: string, request: PromiseLike<{ error: { message: string } | null }>) {
  Promise.resolve(request)
    .then(({ error }) => {
      if (error) console.error(`[db] ${label} failed:`, error.message);
    })
    .catch((err) => console.error(`[db] ${label} failed:`, err));
}

function mergeWithOverrides<T extends { id: string; archived?: boolean }>(
  seed: T[],
  overrides: Record<string, Partial<T>>,
  created: T[]
): T[] {
  const seedMerged = seed.map((item) => ({ ...item, ...(overrides[item.id] ?? {}) }));
  return [...seedMerged, ...created].filter((item) => !item.archived);
}

export const db = {
  // ---- Content reads (agencies/requirements/resources/tutorials) ----
  getAgencies(): Agency[] {
    const s = readStore();
    return mergeWithOverrides(agenciesSeed as Agency[], s.adminOverrides.agencies, s.adminOverrides.createdAgencies);
  },
  getRequirements(): Requirement[] {
    const s = readStore();
    return mergeWithOverrides(
      requirementsSeed as unknown as Requirement[],
      s.adminOverrides.requirements,
      s.adminOverrides.createdRequirements
    );
  },
  getResources(): ResourceItem[] {
    const s = readStore();
    return mergeWithOverrides(resourcesSeed as ResourceItem[], s.adminOverrides.resources, s.adminOverrides.createdResources);
  },
  getTutorials(): Tutorial[] {
    const s = readStore();
    return mergeWithOverrides(tutorialsSeed as Tutorial[], s.adminOverrides.tutorials, s.adminOverrides.createdTutorials);
  },

  // ---- Admin CRUD ----
  upsertRequirement(req: Requirement) {
    const s = readStore();
    const isSeeded = (requirementsSeed as unknown as Requirement[]).some((r) => r.id === req.id);
    if (isSeeded) {
      s.adminOverrides.requirements[req.id] = req;
    } else {
      const idx = s.adminOverrides.createdRequirements.findIndex((r) => r.id === req.id);
      if (idx >= 0) s.adminOverrides.createdRequirements[idx] = req;
      else s.adminOverrides.createdRequirements.push(req);
    }
    writeStore(s);
  },
  archiveRequirement(id: string) {
    const s = readStore();
    const isSeeded = (requirementsSeed as unknown as Requirement[]).some((r) => r.id === id);
    if (isSeeded) s.adminOverrides.requirements[id] = { ...(s.adminOverrides.requirements[id] ?? {}), archived: true };
    else s.adminOverrides.createdRequirements = s.adminOverrides.createdRequirements.filter((r) => r.id !== id);
    writeStore(s);
  },
  upsertResource(res: ResourceItem) {
    const s = readStore();
    const isSeeded = (resourcesSeed as ResourceItem[]).some((r) => r.id === res.id);
    if (isSeeded) s.adminOverrides.resources[res.id] = res;
    else {
      const idx = s.adminOverrides.createdResources.findIndex((r) => r.id === res.id);
      if (idx >= 0) s.adminOverrides.createdResources[idx] = res;
      else s.adminOverrides.createdResources.push(res);
    }
    writeStore(s);
  },
  archiveResource(id: string) {
    const s = readStore();
    const isSeeded = (resourcesSeed as ResourceItem[]).some((r) => r.id === id);
    if (isSeeded) s.adminOverrides.resources[id] = { ...(s.adminOverrides.resources[id] ?? {}), archived: true };
    else s.adminOverrides.createdResources = s.adminOverrides.createdResources.filter((r) => r.id !== id);
    writeStore(s);
  },
  upsertTutorial(tut: Tutorial) {
    const s = readStore();
    const isSeeded = (tutorialsSeed as Tutorial[]).some((t) => t.id === tut.id);
    if (isSeeded) s.adminOverrides.tutorials[tut.id] = tut;
    else {
      const idx = s.adminOverrides.createdTutorials.findIndex((t) => t.id === tut.id);
      if (idx >= 0) s.adminOverrides.createdTutorials[idx] = tut;
      else s.adminOverrides.createdTutorials.push(tut);
    }
    writeStore(s);
  },
  archiveTutorial(id: string) {
    const s = readStore();
    const isSeeded = (tutorialsSeed as Tutorial[]).some((t) => t.id === id);
    if (isSeeded) s.adminOverrides.tutorials[id] = { ...(s.adminOverrides.tutorials[id] ?? {}), archived: true };
    else s.adminOverrides.createdTutorials = s.adminOverrides.createdTutorials.filter((t) => t.id !== id);
    writeStore(s);
  },
  upsertAgency(agency: Agency) {
    const s = readStore();
    const isSeeded = (agenciesSeed as Agency[]).some((a) => a.id === agency.id);
    if (isSeeded) s.adminOverrides.agencies[agency.id] = agency;
    else {
      const idx = s.adminOverrides.createdAgencies.findIndex((a) => a.id === agency.id);
      if (idx >= 0) s.adminOverrides.createdAgencies[idx] = agency;
      else s.adminOverrides.createdAgencies.push(agency);
    }
    writeStore(s);
  },
  archiveAgency(id: string) {
    const s = readStore();
    const isSeeded = (agenciesSeed as Agency[]).some((a) => a.id === id);
    if (isSeeded) s.adminOverrides.agencies[id] = { ...(s.adminOverrides.agencies[id] ?? {}), archived: true };
    else s.adminOverrides.createdAgencies = s.adminOverrides.createdAgencies.filter((a) => a.id !== id);
    writeStore(s);
  },

  // ---- Session lifecycle (called by lib/auth.tsx) ----
  async hydrate(userId: string): Promise<void> {
    const supabase = getSupabase();
    const [profileRes, progressRes, remindersRes, emailsRes] = await Promise.all([
      supabase.from("business_profiles").select("data").eq("user_id", userId).maybeSingle(),
      supabase.from("checklist_progress").select("*").eq("user_id", userId),
      supabase.from("reminder_configs").select("*").eq("user_id", userId),
      // RLS decides what comes back: a normal user gets their own rows, an admin gets everyone's.
      supabase.from("sent_emails").select("*").order("sent_at", { ascending: false }).limit(50),
    ]);

    const firstError = [profileRes, progressRes, remindersRes, emailsRes].find((r) => r.error)?.error;
    if (firstError) throw new Error(firstError.message);

    const next = emptyUserData();
    next.businessProfile = (profileRes.data?.data as BusinessProfile | undefined) ?? null;

    for (const row of progressRes.data ?? []) {
      next.checklistProgress[row.requirement_id] = {
        requirementId: row.requirement_id,
        businessId: row.business_id,
        status: row.status,
        dueDate: row.due_date,
        completedAt: row.completed_at ?? undefined,
      };
    }
    for (const row of remindersRes.data ?? []) {
      next.reminderConfigs[row.requirement_id] = {
        requirementId: row.requirement_id,
        enabled: row.enabled,
        daysBefore: row.days_before,
      };
    }
    next.sentEmails = (emailsRes.data ?? []).map((row) => ({
      id: row.id,
      to: row.to_email,
      subject: row.subject,
      body: row.body,
      sentAt: row.sent_at,
    }));

    currentUserId = userId;
    userData = next;
  },
  clearUserData() {
    currentUserId = null;
    userData = emptyUserData();
  },

  // ---- Business profile (one per user) ----
  getBusinessProfile(userId: string): BusinessProfile | null {
    return userId === currentUserId ? userData.businessProfile : null;
  },
  saveBusinessProfile(profile: BusinessProfile) {
    userData.businessProfile = profile;
    persist(
      "saveBusinessProfile",
      getSupabase()
        .from("business_profiles")
        .upsert({ user_id: profile.userId, data: profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    );
  },

  // ---- Checklist progress ----
  getProgress(): Record<string, ChecklistItem> {
    return userData.checklistProgress;
  },
  markComplete(requirementId: string, businessId: string, dueDate: string) {
    if (!currentUserId) return;
    const completedAt = new Date().toISOString();
    userData.checklistProgress[requirementId] = {
      requirementId,
      businessId,
      status: "completed",
      dueDate,
      completedAt,
    };
    persist(
      "markComplete",
      getSupabase().from("checklist_progress").upsert(
        {
          user_id: currentUserId,
          requirement_id: requirementId,
          business_id: businessId,
          status: "completed",
          due_date: dueDate,
          completed_at: completedAt,
        },
        { onConflict: "user_id,requirement_id" }
      )
    );
  },
  markIncomplete(requirementId: string) {
    if (!currentUserId) return;
    const item = userData.checklistProgress[requirementId];
    if (!item) return;
    delete item.completedAt;
    item.status = "upcoming";
    persist(
      "markIncomplete",
      getSupabase()
        .from("checklist_progress")
        .update({ status: "upcoming", completed_at: null })
        .eq("user_id", currentUserId)
        .eq("requirement_id", requirementId)
    );
  },

  // ---- Reminders ----
  getReminderConfig(requirementId: string): ReminderConfig {
    return userData.reminderConfigs[requirementId] ?? { requirementId, enabled: false, daysBefore: 7 };
  },
  setReminderConfig(config: ReminderConfig) {
    if (!currentUserId) return;
    userData.reminderConfigs[config.requirementId] = config;
    persist(
      "setReminderConfig",
      getSupabase().from("reminder_configs").upsert(
        {
          user_id: currentUserId,
          requirement_id: config.requirementId,
          enabled: config.enabled,
          days_before: config.daysBefore,
        },
        { onConflict: "user_id,requirement_id" }
      )
    );
  },
  getAllReminderConfigs(): ReminderConfig[] {
    return Object.values(userData.reminderConfigs);
  },

  // ---- Email log ----
  // B2: no client-side appendSentEmail/write anymore — app/api/send-email
  // writes the log row itself server-side (with the caller's own token) as
  // part of enforcing its rate limit. This just re-reads that slice after
  // a send, so the UI (and the admin dashboard's log) reflects the row the
  // server just wrote, without a second, client-triggered insert.
  async refreshSentEmails(): Promise<void> {
    if (!currentUserId) return;
    const { data, error } = await getSupabase()
      .from("sent_emails")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(50);
    if (error) return; // best-effort; the send itself already succeeded
    userData.sentEmails = (data ?? []).map((row) => ({
      id: row.id,
      to: row.to_email,
      subject: row.subject,
      body: row.body,
      sentAt: row.sent_at,
    }));
  },
  getSentEmails(): SentEmail[] {
    return userData.sentEmails;
  },

  // ---- Reset (local only: clears admin content edits + the in-memory cache; does NOT delete Supabase rows) ----
  resetAll() {
    writeStore(emptyStore());
    userData = emptyUserData();
  },
};
