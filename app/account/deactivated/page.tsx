import Link from "next/link";

export const metadata = { title: "Account deactivated", robots: { index: false } };

export default function AccountDeactivatedPage() {
  return (
    <main className="screen">
      <header className="intro">
        <h1>Your account is deactivated</h1>
        <p>You have been signed out. Your saved data is kept. Log in again and choose Reactivate whenever you want to continue.</p>
      </header>
      <div className="hero-actions">
        <Link href="/login" className="primary-btn">Log in to reactivate</Link>
        <Link href="/" className="secondary-btn">Back to home</Link>
      </div>
    </main>
  );
}
