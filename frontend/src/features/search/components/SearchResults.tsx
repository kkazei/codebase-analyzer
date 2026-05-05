import type { SearchResult } from "../types";

interface SearchResultsProps {
  isLoading: boolean;
  errorMessage?: string | null;
  results: SearchResult[];
}

export function SearchResults({
  isLoading,
  errorMessage,
  results,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 text-sm text-[var(--text-muted)]">
        Running search...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 text-sm text-[var(--text-muted)]">
        {errorMessage}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 text-sm text-[var(--text-muted)]">
        No matches yet. Try a more specific query.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {results.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Result
          </p>
          <h2 className="mt-3 text-base font-semibold text-[var(--text-strong)]">
            {item.title ?? item.id}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {item.content ?? "No preview available yet."}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Score {item.score.toFixed(3)}
          </p>
        </div>
      ))}
    </div>
  );
}
