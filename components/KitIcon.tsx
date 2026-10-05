/**
 * Small inline SVG icon set for the design-kit navigation.
 *
 * The kit prototypes used Unicode glyphs (▦ ☑ ◷ …), which render differently
 * (or as emoji / missing boxes) across Android fonts. These are plain SVG
 * paths, decorative only (aria-hidden): every control that uses one also
 * carries a visible or aria label. No icon-font or library dependency, in
 * line with Design-System.md.
 */
export type KitIconName =
  | "overview"
  | "checklist"
  | "guide"
  | "penalties"
  | "renewal"
  | "resources"
  | "tutorials"
  | "deadlines"
  | "account"
  | "agencies"
  | "requirements"
  | "users"
  | "logout"
  | "moon"
  | "sun";

const PATHS: Record<KitIconName, string> = {
  overview: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  checklist: "M9 6h11M9 12h11M9 18h11M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17",
  guide: "M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM8 8h6M8 12h6",
  penalties: "M12 3l10 18H2zM12 10v5M12 18v.5",
  renewal: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  resources: "M4 6h16v13H4zM4 6l2-2h5l2 2M8 11h8M8 15h5",
  tutorials: "M4 5h16v11H4zM10 8.5v4.5l4-2.25zM8 20h8",
  deadlines: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0",
  agencies: "M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6",
  requirements: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.2a6.5 6.5 0 0 1 3.5 5.8",
  logout: "M10 4H5v16h5M14 8l4 4-4 4M18 12H9",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
};

export default function KitIcon({ name, size = 20 }: { name: KitIconName; size?: number }) {
  return (
    <svg
      className="kit-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
