interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function SearchForm({ value, onChange, onSubmit }: SearchFormProps) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label
        htmlFor="search-input"
        className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]"
      >
        Query
      </label>
      <input
        id="search-input"
        type="search"
        placeholder="Search by symbol, path, or intent"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      />
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
        Press enter to run a search
      </p>
    </form>
  );
}
