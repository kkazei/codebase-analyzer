import type { SearchResult } from "../types";

interface SearchResultsProps {
  isLoading: boolean;
  errorMessage?: string | null;
  results: SearchResult[];
  hasSearched: boolean;
}

export function SearchResults({
  isLoading,
  errorMessage,
  results,
  hasSearched,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div role="status" className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--text)]">
        Searching indexed files…
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div role="alert" className="rounded-lg border border-[var(--danger)]/60 bg-[var(--surface-strong)] p-4 text-sm text-[var(--text-strong)]">
        {errorMessage}
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--text-muted)]">
        Enter a query to see matching files.
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-5 text-sm text-[var(--text)]">
        No code matched this search. Try a file name or describe the behavior you are looking for.
      </div>
    );
  }

  return (
    <ol aria-label="Matching files" className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {results.map((item) => (
        <li
          key={item.id}
          className="py-4 first:pt-4 last:pb-4"
        >
          <h3 className="break-words font-mono text-sm font-medium text-[var(--text-strong)]">
            {item.title ?? item.id}
          </h3>
          <div className="mt-2 max-h-40 overflow-auto rounded-md bg-[var(--surface-strong)] px-3 py-2">
            <p className="break-words whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
              {item.content ?? "No preview available yet."}
            </p>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Match score {item.score.toFixed(3)}
          </p>
        </li>
      ))}
    </ol>
  );
}
