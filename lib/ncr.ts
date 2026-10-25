/**
 * NCR LOCALITIES — single typed source for every locality list in the app.
 *
 * Scope rule: national agency requirements (BIR, SSS, PhilHealth, Pag-IBIG) never
 * depend on the locality. Only LGU permit guidance is locality-aware, and only
 * where `lguGuidance` is "verified". No NCR locality is marked verified yet:
 * the LGU permit content in data/requirements.json is generic and unverified per city.
 * Do not flip a locality to "verified" without an official source (see docs/USER_INPUT_REQUIRED.md).
 */
export type LocalityType = "city" | "municipality";
export type LguGuidanceStatus = "verified" | "generic_unverified";

export interface Locality {
  id: string;
  name: string;
  type: LocalityType;
  /** Whether a barangay list exists in data/ncrBarangays.json for this locality (true for all NCR localities). */
  barangayLookup: boolean;
  lguGuidance: LguGuidanceStatus;
}

const L = (id: string, name: string, type: LocalityType = "city", barangayLookup = true): Locality => ({
  id,
  name,
  type,
  barangayLookup,
  lguGuidance: "generic_unverified",
});

export const NCR_LOCALITIES: readonly Locality[] = [
  L("manila", "City of Manila"),
  L("quezon_city", "Quezon City"),
  L("caloocan", "Caloocan"),
  L("las_pinas", "Las Piñas"),
  L("makati", "Makati"),
  L("malabon", "Malabon"),
  L("mandaluyong", "Mandaluyong"),
  L("marikina", "Marikina"),
  L("muntinlupa", "Muntinlupa"),
  L("navotas", "Navotas"),
  L("paranaque", "Parañaque"),
  L("pasay", "Pasay"),
  L("pasig", "Pasig"),
  L("san_juan", "San Juan"),
  L("taguig", "Taguig"),
  L("valenzuela", "Valenzuela"),
  L("pateros", "Pateros", "municipality"),
];

export type RdoBasis = "app_data" | "official" | "office";
export interface BarangayOption {
  name: string;
  /** PSA PSGC 10-digit code. */
  code: string;
  /** Manila only: PSGC sub-municipality (district). */
  district?: string;
  rdoCode?: string;
  /**
   * app_data = pre-existing data/barangayRdo.json (Quezon City); official = listed in a BIR order (RAO 004-19);
   * office = only inferred from the RDO office name for the city/district -> show as a suggestion, never store.
   */
  rdoBasis?: RdoBasis;
}

export const DEFAULT_LOCALITY_ID = "quezon_city";

export function getLocality(id: string | null | undefined): Locality | undefined {
  return NCR_LOCALITIES.find((l) => l.id === id);
}

/** Profiles saved before v0.13 have a QC barangay and no locality: they were Quezon City. */
export function localityIdOf(profile: { locality?: string; barangay?: string } | null | undefined): string {
  if (!profile) return "";
  if (profile.locality && getLocality(profile.locality)) return profile.locality;
  return profile.barangay ? DEFAULT_LOCALITY_ID : "";
}

export function localityLabel(profile: { locality?: string; barangay?: string } | null | undefined): string {
  const loc = getLocality(localityIdOf(profile));
  return loc ? loc.name : "";
}

export function formatLocation(barangay: string, localityId: string): string {
  const name = getLocality(localityId)?.name ?? "";
  return [barangay.trim(), name].filter(Boolean).join(", ");
}
