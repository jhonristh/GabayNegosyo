import agenciesSeed from "../data/agencies.json";
import requirementsSeed from "../data/requirements.json";
import resourcesSeed from "../data/resources.json";
import tutorialsSeed from "../data/tutorials.json";
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
 * DATA / SERVICE LAYER
 * ────────────────────
 * This is the single point of contact between UI and data. In this
 * prototype it reads seed JSON (the "database") and persists user-specific
 * state (business profiles, checklist progress, admin edits, reminders,
 * sent-mail log) to localStorage under one namespaced key.
 *
 * To move to Supabase later: reimplement the functions in this file to
 * call `supabase.from(...)` instead of localStorage, keeping the same
 * function signatures. No UI code should need to change. See
 * database/schema.sql for the target relational structure.
 */

const STORE_KEY = "gn_store_v1";

interface Store {
  businessProfiles: Record<string, BusinessProfile>; // by userId
  checklistProgress: Record<string, ChecklistItem>; // by requirementId (single-user demo)
  reminderConfigs: Record<string, ReminderConfig>; // by requirementId
  sentEmails: SentEmail[];
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
    businessProfiles: {},
    checklistProgress: {},
    reminderConfigs: {},
    sentEmails: [],
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
    return { ...emptyStore(), ...parsed, adminOverrides: { ...emptyStore().adminOverrides, ...parsed.adminOverrides } };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
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

  // ---- Business profile (single-user demo, keyed by userId) ----
  getBusinessProfile(userId: string): BusinessProfile | null {
    const s = readStore();
    return s.businessProfiles[userId] ?? null;
  },
  saveBusinessProfile(profile: BusinessProfile) {
    const s = readStore();
    s.businessProfiles[profile.userId] = profile;
    writeStore(s);
  },

  // ---- Checklist progress ----
  getProgress(): Record<string, ChecklistItem> {
    return readStore().checklistProgress;
  },
  markComplete(requirementId: string, businessId: string, dueDate: string) {
    const s = readStore();
    s.checklistProgress[requirementId] = {
      requirementId,
      businessId,
      status: "completed",
      dueDate,
      completedAt: new Date().toISOString(),
    };
    writeStore(s);
  },
  markIncomplete(requirementId: string) {
    const s = readStore();
    if (s.checklistProgress[requirementId]) {
      delete s.checklistProgress[requirementId].completedAt;
      s.checklistProgress[requirementId].status = "upcoming";
    }
    writeStore(s);
  },

  // ---- Reminders ----
  getReminderConfig(requirementId: string): ReminderConfig {
    const s = readStore();
    return s.reminderConfigs[requirementId] ?? { requirementId, enabled: false, daysBefore: 7 };
  },
  setReminderConfig(config: ReminderConfig) {
    const s = readStore();
    s.reminderConfigs[config.requirementId] = config;
    writeStore(s);
  },
  getAllReminderConfigs(): ReminderConfig[] {
    return Object.values(readStore().reminderConfigs);
  },

  // ---- Email log ----
  appendSentEmail(email: SentEmail) {
    const s = readStore();
    s.sentEmails.unshift(email);
    writeStore(s);
  },
  getSentEmails(): SentEmail[] {
    return readStore().sentEmails;
  },

  // ---- Reset (useful for demo/testing) ----
  resetAll() {
    writeStore(emptyStore());
  },
};
