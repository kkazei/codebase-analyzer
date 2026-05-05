import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="flex flex-col items-start gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
        404
      </p>
      <h1 className="text-3xl font-semibold text-[var(--text-strong)]">
        This view does not exist yet.
      </h1>
      <p className="text-sm text-[var(--text-muted)]">
        Head back to the home page to continue exploring the workspace.
      </p>
      <Link
        to="/"
        className="rounded-full border border-[var(--border)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        Back home
      </Link>
    </section>
  );
}
