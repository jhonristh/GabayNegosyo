import Link from "next/link";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="screen not-found">
      <p className="eyebrow-free">Error 404</p>
      <h1>We couldn't find that page.</h1>
      <p className="hero-sub">
        The link may be outdated, or the page may have moved. Head back to your dashboard, or
        start from the homepage.
      </p>
      <div className="hero-actions">
        <Link href="/dashboard" className="primary-btn">
          Go to my dashboard
        </Link>
        <Link href="/" className="secondary-btn">
          Back to homepage
        </Link>
      </div>
    </main>
  );
}
