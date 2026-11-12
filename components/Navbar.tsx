"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type PointerEvent } from "react";
import { useAuth } from "../lib/auth";
import KitIcon, { type KitIconName } from "./KitIcon";
import { ThemeToggle } from "./ThemeControls";

/**
 * Navigation for the three shells (see docs/DESIGN.md §4):
 *   - signed out  → Regulatory Atlas header
 *   - user        → Growth Ledger sidebar (desktop) + Pocket Guide bar (mobile)
 *   - admin       → Command Desk icon rail + menu (desktop), scrolling bar (mobile)
 * Only presentation lives here; routes, roles and guards are unchanged.
 */

type NavItem = { href: string; label: string; mobileLabel?: string; icon: KitIconName };

const USER_LINKS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/checklist", label: "1. Checklist", mobileLabel: "Checklist", icon: "checklist" },
  { href: "/registration", label: "2. Business Registration", mobileLabel: "Register", icon: "guide" },
  { href: "/bir-forms", label: "3. BIR Forms", mobileLabel: "BIR Forms", icon: "requirements" },
  { href: "/penalties", label: "4. Penalties", mobileLabel: "Penalties", icon: "penalties" },
  { href: "/renewal", label: "5. Renewal & Post-Registration", mobileLabel: "Renewal", icon: "renewal" },
  { href: "/resources", label: "Resources", icon: "resources" },
  { href: "/tutorials", label: "Tutorials", icon: "tutorials" },
  { href: "/deadlines", label: "Deadlines", icon: "deadlines" },
  { href: "/tax-calculator", label: "Tax Calculator", icon: "penalties" },
  { href: "/account", label: "Account", icon: "account" },
];

const MOBILE_TABS = ["/dashboard", "/checklist", "/deadlines", "/resources", "/tutorials"]
  .map((href) => USER_LINKS.find((link) => link.href === href)!);
const MORE_LINKS = USER_LINKS.filter((link) => !MOBILE_TABS.includes(link));

const ADMIN_LINKS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "overview" },
  { href: "/admin/agencies", label: "Agencies", icon: "agencies" },
  { href: "/admin/requirements", label: "Requirements", icon: "requirements" },
  { href: "/admin/resources", label: "Resources", icon: "resources" },
  { href: "/admin/tutorials", label: "Tutorials", icon: "tutorials" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/audit", label: "Audit log", icon: "requirements" },
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

function MobilePageSwitcher({ pathname }: { pathname: string | null }) {
  const router = useRouter();
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    function cancelOnAdditionalTouch(event: globalThis.PointerEvent) {
      if (event.pointerType === "touch" && !event.isPrimary) start.current = null;
    }
    document.addEventListener("pointerdown", cancelOnAdditionalTouch, true);
    return () => document.removeEventListener("pointerdown", cancelOnAdditionalTouch, true);
  }, []);
  const index = USER_LINKS.findIndex((link) => link.href === pathname);
  if (index < 0) return null;
  const current = USER_LINKS[index];
  const previous = USER_LINKS[index - 1];
  const next = USER_LINKS[index + 1];

  function begin(event: PointerEvent<HTMLDivElement>) {
    start.current = event.pointerType === "touch" && event.isPrimary
      ? { id: event.pointerId, x: event.clientX, y: event.clientY }
      : null;
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    const origin = start.current;
    start.current = null;
    if (!origin || origin.id !== event.pointerId) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
    const destination = dx < 0 ? next : previous;
    if (destination) router.push(destination.href);
  }

  return (
    <nav className="mobile-page-switcher" aria-label="Previous and next workspace pages">
      {previous ? (
        <Link href={previous.href} aria-label={`Previous page: ${previous.label}`} prefetch={false}>
          <KitIcon name="previous" />
        </Link>
      ) : <span />}
      <div
        className="mobile-swipe-area"
        onPointerDown={begin}
        onPointerUp={finish}
        onPointerCancel={() => { start.current = null; }}
      >
        <strong>{current.mobileLabel ?? current.label}</strong>
        <span>Swipe here to switch pages</span>
      </div>
      {next ? (
        <Link href={next.href} aria-label={`Next page: ${next.label}`} prefetch={false}>
          <KitIcon name="next" />
        </Link>
      ) : <span />}
    </nav>
  );
}

function MobileBottomNav({ pathname }: { pathname: string | null }) {
  const more = useRef<HTMLDetailsElement>(null);
  const moreButton = useRef<HTMLElement>(null);

  useEffect(() => {
    function closeOutside(event: globalThis.PointerEvent) {
      const menu = more.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return (
    <nav className="navbar-mobile" aria-label="Primary">
      {MOBILE_TABS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link key={link.href} href={link.href} className={active ? "mobile-link active" : "mobile-link"} aria-current={active ? "page" : undefined}>
            <KitIcon name={link.icon} size={20} />
            <span>{link.mobileLabel ?? link.label}</span>
          </Link>
        );
      })}
      <details
        className="mobile-more"
        ref={more}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !event.currentTarget.open) return;
          event.preventDefault();
          event.currentTarget.open = false;
          moreButton.current?.focus();
        }}
      >
        <summary ref={moreButton} className={MORE_LINKS.some((link) => isActive(pathname, link.href)) ? "mobile-link active" : "mobile-link"}>
          <KitIcon name="more" size={20} />
          <span>More</span>
        </summary>
        <div className="mobile-more-links">
          {MORE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              onNavigate={() => { if (more.current) more.current.open = false; }}
            >
              <KitIcon name={link.icon} size={18} />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </details>
    </nav>
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
          <div className="public-display-desktop"><ThemeToggle className="kit-theme-toggle--icon" /></div>
          <details className="public-display-mobile">
            <summary>Display options</summary>
            <ThemeToggle className="kit-theme-toggle--icon" />
          </details>
          <Link href="/wizard" className="primary-btn nav-cta">
            Get started <KitIcon name="next" size={16} />
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

  return (
    <>
      <header className="mobile-brand-head">
        <Brand href="/dashboard" size={38} label="GabayNegosyo overview" />
        <ThemeToggle className="kit-theme-toggle--icon" />
      </header>
      <MobilePageSwitcher key={`switcher:${pathname}`} pathname={pathname} />

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

      <MobileBottomNav key={`bottom-nav:${pathname}`} pathname={pathname} />
    </>
  );
}
