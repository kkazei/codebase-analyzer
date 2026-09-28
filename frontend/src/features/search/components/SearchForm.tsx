interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function SearchForm({
  value,
  onChange,
  disabled = false,
  isLoading = false,
}: SearchFormProps) {
  const trimmedValue = value.trim();

  return (
    <div className="grid gap-2.5">
      <label htmlFor="search-input" className="text-sm font-medium text-[var(--text)]">
        Search indexed code
      </label>
      <div className="relative">
        <input
          id="search-input"
          type="search"
          placeholder="Try a symbol, file path or behavior"
          aria-describedby="search-help"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-12 w-full rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] py-2 pl-4 pr-12 text-sm text-[var(--text-strong)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_4%,transparent)] transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[var(--text-muted)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_32%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
          fill="none"
        >
          <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="m10.25 10.25 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p id="search-help" role="status" className="min-h-4 text-xs text-[var(--text-muted)]">
        {disabled
          ? "Search becomes available once indexing finishes."
          : isLoading
            ? "Searching indexed files…"
            : trimmedValue.length === 1
              ? "Enter at least 2 characters."
              : "Results update as you type."}
      </p>
    </div>
  );
}
