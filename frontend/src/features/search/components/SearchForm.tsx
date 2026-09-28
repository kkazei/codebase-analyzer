interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function SearchForm({
  value,
  onChange,
  onSubmit,
  disabled = false,
  isLoading = false,
}: SearchFormProps) {
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim().length > 1) {
          onSubmit();
        }
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label
          htmlFor="search-input"
          className="text-sm font-medium text-[var(--text)]"
        >
          Search indexed code
        </label>
        <input
          id="search-input"
          type="search"
          placeholder="Try a symbol, file path or behavior"
          aria-describedby="search-help"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p id="search-help" className="text-xs text-[var(--text-muted)]">
          {value.trim().length === 1 ? "Enter at least 2 characters." : "Search by name, path or behavior."}
        </p>
      </div>
      <button
        type="submit"
        disabled={disabled || value.trim().length < 2 || isLoading}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
          <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="m10.25 10.25 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {isLoading ? "Searching…" : "Search code"}
      </button>
    </form>
  );
}
