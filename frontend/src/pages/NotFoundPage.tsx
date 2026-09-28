import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="flex min-h-[320px] flex-col items-start justify-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      <p className="text-sm font-medium text-[var(--text-muted)]">
        404
      </p>
      <h1 className="text-2xl font-semibold text-[var(--text-strong)] sm:text-3xl">
        This page could not be found.
      </h1>
      <p className="max-w-lg text-sm leading-6 text-[var(--text-muted)]">
        The address may be outdated or typed incorrectly. Return to repository analysis to continue.
      </p>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
      >
        Open repository analysis
      </Link>
    </section>
  );
}
