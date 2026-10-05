"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import KitIcon, { type KitIconName } from "./KitIcon";
import { ThemeToggle } from "./ThemeControls";

/**
 * Navigation for the three shells (see docs/DESIGN_KITS.md):
 *   - signed out  → Regulatory Atlas header
 *   - user        → Growth Ledger sidebar (desktop) + Pocket Guide bar (mobile)
 *   - admin       → Command Desk icon rail + menu (desktop), scrolling bar (mobile)
 * Only presentation lives here; routes, roles and guards are unchanged.
 */

type NavItem = { href: string; label: string; mobileLabel?: string; icon: KitIconName; mobile?: boolean };

// The full desktop list. `mobile: false` keeps Tutorials off the bottom bar,
// exactly as before (six items is the most a phone bar can hold legibly).
const USER_LINKS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview", mobile: false },
  { href: "/checklist", label: "1. Checklist", mobileLabel: "Checklist", icon: "checklist" },
  { href: "/registration", label: "2. Business Registration", mobileLabel: "Register", icon: "guide" },
  { href: "/bir-forms", label: "3. BIR Forms", mobileLabel: "BIR Forms", icon: "requirements" },
  { href: "/penalties", label: "4. Penalties", mobileLabel: "Penalties", icon: "penalties" },
  { href: "/renewal", label: "5. Renewal & Post-Registration", mobileLabel: "Renewal", icon: "renewal" },
  { href: "/resources", label: "Resources", icon: "resources", mobile: false },
  { href: "/tutorials", label: "Tutorials", icon: "tutorials", mobile: false },
  { href: "/deadlines", label: "Deadlines", icon: "deadlines", mobile: false },
  { href: "/account", label: "Account", icon: "account" },
];

const ADMIN_LINKS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "overview" },
  { href: "/admin/agencies", label: "Agencies", icon: "agencies" },
  { href: "/admin/requirements", label: "Requirements", icon: "requirements" },
  { href: "/admin/resources", label: "Resources", icon: "resources" },
  { href: "/admin/tutorials", label: "Tutorials", icon: "tutorials" },
  { href: "/admin/users", label: "Users", icon: "users" },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href === "/admin") return false; // /admin/* pages belong to their own entries
  if (href === "/checklist" && pathname.startsWith("/requirements/")) return true; // detail pages live under Checklist
  return pathname.startsWith(`${href}/`);
}

function Brand({ href, size, label, children }: { href: string; size: number; label?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="brand" aria-label={label}>
      <Image src="/icons/icon-192.png" width={size} height={size} alt="" priority />
      <span>
        Gabay<span className="brand-highlight">Negosyo</span>
        {children}
      </span>
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) {
    return (
      <header className="navbar-public">
        <Brand href="/" size={42} />
        <nav aria-label="Main">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/#plans">Plans</Link>
          <Link href="/login">Log in</Link>
          <ThemeToggle className="kit-theme-toggle--icon" />
          <Link href="/wizard" className="primary-btn nav-cta">
            Get started ↗
          </Link>
        </nav>
      </header>
    );
  }

  if (user.role === "admin") {
    const adminActive = (href: string) => (href === "/admin" ? pathname === "/admin" : isActive(pathname, href));
    return (
      <>
        {/* Command Desk, desktop: quick-access icon rail + labelled menu. The rail only echoes the
            menu, so it is hidden from assistive tech and the tab order. */}
        <aside className="kit-rail" aria-hidden="true">
          <Link href="/admin" tabIndex={-1} className="kit-rail-brand">
            <Image src="/icons/icon-192.png" width={35} height={35} alt="" />
          </Link>
          {ADMIN_LINKS.map((item) => (
            <Link key={item.href} href={item.href} tabIndex={-1} className={adminActive(item.href) ? "on" : ""}>
              <KitIcon name={item.icon} size={18} />
            </Link>
          ))}
        </aside>
        <nav className="kit-menu" aria-label="Admin">
          <span className="gn-small kit-muted">Content workspace</span>
          <b>Admin center</b>
          {ADMIN_LINKS.map((item) => {
            const active = adminActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "on" : ""} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
          <div className="kit-menu-foot">
            <ThemeToggle />
            <button type="button" className="kit-menu-logout" onClick={logout}>
              <KitIcon name="logout" size={18} />
              <span>Log out</span>
            </button>
          </div>
        </nav>
        {/* Below 860px the rails collapse into the original scrolling admin bar. */}
        <header className="navbar-admin">
          <Brand href="/admin" size={38}>
            {" "}
            <small>Admin</small>
          </Brand>
          <nav className="admin-nav" aria-label="Admin">
            {ADMIN_LINKS.map((item) => {
              const active = adminActive(item.href);
              return (
                <Link key={item.href} href={item.href} className={active ? "on" : ""} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              );
            })}
            <ThemeToggle className="kit-theme-toggle--icon" />
            <button className="text-btn" onClick={logout}>
              Log out
            </button>
          </nav>
        </header>
      </>
    );
  }

  const mobileLinks = USER_LINKS.filter((link) => link.mobile !== false);

  return (
    <>
      <header className="mobile-brand-head">
        <Brand href="/dashboard" size={38} label="GabayNegosyo overview" />
        <ThemeToggle className="kit-theme-toggle--icon" />
      </header>

      {/* Growth Ledger sidebar (desktop) */}
      <aside className="kit-sidebar">
        <Brand href="/dashboard" size={38} label="GabayNegosyo overview" />
        <nav className="kit-side-nav" aria-label="Primary">
          {USER_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link key={link.href} href={link.href} className={active ? "on" : ""} aria-current={active ? "page" : undefined}>
                <KitIcon name={link.icon} size={18} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="kit-side-foot">
          <ThemeToggle />
          <span className="gn-small kit-muted">Guide · Support · Grow</span>
        </div>
      </aside>

      {/* Pocket Guide bottom bar (mobile) */}
      <nav className="navbar-mobile" aria-label="Primary">
        {mobileLinks.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link key={link.href} href={link.href} className={active ? "mobile-link active" : "mobile-link"} aria-current={active ? "page" : undefined}>
              <KitIcon name={link.icon} size={20} />
              <span>{link.mobileLabel ?? link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
