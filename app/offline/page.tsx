import EmptyStateIllustration from "../../components/EmptyStateIllustration";
export const metadata = {
  title: "You're offline",
  robots: { index: false },
};

/**
 * L13/WP8: the service worker's navigation fallback for a same-origin page
 * that isn't in the runtime cache and can't be reached over the network.
 * Deliberately static and tiny — this must render from the precache with
 * zero network requests of its own.
 */
export default function OfflinePage() {
  return (
    <main className="screen">
      <EmptyStateIllustration variant="offline" /><p className="eyebrow-free">No connection</p>
      <h1>You&apos;re offline right now.</h1>
      <p className="hero-sub">
        This page needs a network connection we can&apos;t reach. For your privacy, account pages are not saved for offline viewing. Reconnect
        and try again; changes will only be saved after the server confirms them.
      </p>
      <div className="hero-actions">
        <a href="/" className="primary-btn">
          Try again
        </a>
      </div>
    </main>
  );
}
