import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="relative flex flex-col gap-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[var(--accent-soft)] blur-[120px]" />
        <div className="absolute right-0 top-[-120px] h-96 w-96 rounded-full bg-[var(--accent-strong)]/50 blur-[160px]" />
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_var(--surface-strong),_transparent_70%)] opacity-70" />
      </div>

      <section className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-8">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--accent)]">
            Modern code intelligence
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-[var(--text-strong)] sm:text-5xl">
            A clean, precise way to explore large codebases without losing
            context.
          </h1>
          <p className="max-w-xl text-base leading-7 text-[var(--text-muted)]">
            Built for engineering teams who need fast answers, trusted
            retrieval, and a UI that respects focus. Everything you need to map,
            search, and chat with your repository in one place.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/search"
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_var(--accent-strong)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_44px_-18px_var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              Start analysis
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_-40px_var(--shadow)]">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                Repository pulse
              </p>
              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Live
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Files indexed", value: "18,420" },
                { label: "Dependencies mapped", value: "1,247" },
                { label: "Active namespaces", value: "312" },
                { label: "Latency", value: "148ms" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-3 text-xl font-semibold text-[var(--text-strong)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Coverage
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div className="h-full w-[78%] rounded-full bg-[linear-gradient(90deg,_var(--accent),_var(--accent-strong))]" />
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                78% of repository indexed with live embeddings.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "Search with precision",
            description:
              "Vector + keyword retrieval tuned for large mono repos.",
          },
          {
            title: "Trace architecture",
            description:
              "See modules, edges, and ownership without context switches.",
          },
          {
            title: "Ship with confidence",
            description: "Trace impacts before you refactor or merge.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_16px_40px_-30px_var(--shadow)]"
          >
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              {item.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              {item.description}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
