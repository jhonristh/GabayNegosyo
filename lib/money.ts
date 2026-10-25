/** Whole-peso formatter with thousands separators. Deterministic (no locale lookup), so server and browser render the same text. */
export function peso(n: number): string {
  return `₱${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
