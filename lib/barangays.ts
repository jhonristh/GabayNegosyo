import barangaysData from "../data/ncrBarangays.json";
import type { BarangayOption } from "./ncr";

/**
 * Barangays of an NCR locality from PSA PSGC 2Q 2026 (see data/ncr-barangays/README_REPORT.md).
 * Kept apart from lib/ncr.ts so that file stays JSON-import free (tests load it directly in Node).
 */
export function getBarangays(localityId: string | null | undefined): BarangayOption[] {
  if (!localityId) return [];
  return (barangaysData as unknown as Record<string, BarangayOption[]>)[localityId] ?? [];
}
