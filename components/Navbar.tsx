"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

const USER_LINKS = [
  { href: "/dashboard", label: "Overview", mobileLabel: "Overview" },
  { href: "/checklist", label: "Checklist", mobileLabel: "Checklist" },
  { href: "/guide", label: "Guide", mobileLabel: "Guide" },
  { href: "/resources", label: "Resources", mobileLabel: "Resources" },
  { href: "/deadlines", label: "Deadlines", mobileLabel: "Alerts" },
  { href: "/account", label: "Account", mobileLabel: "Account" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) {
    return (
      <header className="navbar-public">
        <Link href="/" className="brand">
          <Image src="/icons/icon-192.png" width={42} height={42} alt="" priority />
          <span>Gabay<span className="brand-highlight">Negosyo</span></span>
        </Link>
        <nav>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/#plans">Plans</Link>
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="primary-btn nav-cta">
            Get started ↗
          </Link>
        </nav>
      </header>
    );
  }

  if (user.role === "admin") {
    return (
      <header className="navbar-admin">
        <Link href="/admin" className="brand">
          <Image src="/icons/icon-192.png" width={42} height={42} alt="" priority />
          <span>Gabay<span className="brand-highlight">Negosyo</span> <small>Admin</small></span>
        </Link>
        <nav className="admin-nav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/agencies">Agencies</Link>
          <Link href="/admin/requirements">Requirements</Link>
          <Link href="/admin/resources">Resources</Link>
          <Link href="/admin/tutorials">Tutorials</Link>
          <button className="text-btn" onClick={logout}>
            Log out
          </button>
        </nav>
      </header>
    );
  }

  return (
    <>
      <header className="mobile-brand-head">
        <Link href="/dashboard" className="brand" aria-label="GabayNegosyo overview">
          <Image src="/icons/icon-192.png" width={38} height={38} alt="" />
          <span>Gabay<span className="brand-highlight">Negosyo</span></span>
        </Link>
      </header>
      <header className="navbar-desktop">
        <Link href="/dashboard" className="brand">
          <Image src="/icons/icon-192.png" width={42} height={42} alt="" priority />
          <span>Gabay<span className="brand-highlight">Negosyo</span></span>
        </Link>
        <nav>
          <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
            Overview
          </Link>
          <Link href="/checklist" className={pathname === "/checklist" ? "active" : ""}>
            Checklist
          </Link>
          <Link href="/guide" className={pathname === "/guide" ? "active" : ""}>
            Guide
          </Link>
          <Link href="/resources" className={pathname === "/resources" ? "active" : ""}>
            Resources
          </Link>
          <Link href="/tutorials" className={pathname === "/tutorials" ? "active" : ""}>
            Tutorials
          </Link>
          <Link href="/deadlines" className={pathname === "/deadlines" ? "active" : ""}>
            Deadlines
          </Link>
          <Link href="/account" className={pathname === "/account" ? "active" : ""}>
            Account
          </Link>
        </nav>
      </header>

      <nav className="navbar-mobile" aria-label="Primary">
        {USER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? "mobile-link active" : "mobile-link"}
          >
            {link.mobileLabel}
          </Link>
        ))}
      </nav>
    </>
  );
}
