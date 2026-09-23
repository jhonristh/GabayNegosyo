import NotFoundActions from "../components/NotFoundActions";

export const metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="screen not-found">
      <p className="eyebrow-free">Error 404</p>
      <h1>We couldn&apos;t find that page.</h1>
      {/* Owner-approved Filipino line (WP8) — flagged for native-speaker
          review before this ships; shown alongside the English copy, not
          replacing it, until that review happens. */}
      <p className="hero-sub" lang="fil">
        Mukhang naligaw ka. Parang requirement na walang deadline.
      </p>
      <p className="hero-sub">
        The link may be outdated, or the page may have moved.
      </p>
      <NotFoundActions />
    </main>
  );
}
