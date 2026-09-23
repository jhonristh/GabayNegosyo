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
      <p className="eyebrow-free">No connection</p>
      <h1>You&apos;re offline right now.</h1>
      <p className="hero-sub">
        This page needs a network connection we can&apos;t reach. Pages you&apos;ve already
        visited on this device may still open from where you left off; reconnect and try again
        for anything else.
      </p>
      <div className="hero-actions">
        <a href="/" className="primary-btn">
          Try again
        </a>
      </div>
    </main>
  );
}
