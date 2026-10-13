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
  /** Whether a barangay → RDO lookup exists in data/barangayRdo.json for this locality. */
  barangayLookup: boolean;
  lguGuidance: LguGuidanceStatus;
}

const L = (id: string, name: string, type: LocalityType = "city", barangayLookup = false): Locality => ({
  id,
  name,
  type,
  barangayLookup,
  lguGuidance: "generic_unverified",
});

export const NCR_LOCALITIES: readonly Locality[] = [
  L("manila", "City of Manila"),
  L("quezon_city", "Quezon City", "city", true),
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
