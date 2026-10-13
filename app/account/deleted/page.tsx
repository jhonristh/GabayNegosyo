import Link from "next/link";

export const metadata = { title: "Account deleted", robots: { index: false } };

export default function AccountDeletedPage() {
  return (
    <main className="screen">
      <header className="intro">
        <h1>Your account has been deleted</h1>
        <p>Your sign-in and the business profile, checklist progress and reminder settings linked to it were removed.</p>
      </header>
      <p className="hint">Anything saved only in this browser (such as a profile picture or theme) can be cleared in your browser settings.</p>
      <div className="hero-actions">
        <Link href="/" className="primary-btn">Back to home</Link>
      </div>
    </main>
  );
}
