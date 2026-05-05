import { useMemo, useState } from "react";

import type { ChatTurn } from "@/features/chat";
import { useChat } from "@/features/chat";
import { useIngest } from "@/features/ingest";
import { SearchForm, SearchResults, useSearch } from "@/features/search";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const { data, isLoading, error } = useSearch(submittedQuery);
  const ingestMutation = useIngest();
  const chatMutation = useChat();
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : "Search failed. Try again."
    : null;

  const ingestStatus = useMemo(() => {
    if (ingestMutation.isPending) {
      return "Indexing repository...";
    }

    if (ingestMutation.isSuccess) {
      const payload = ingestMutation.data;
      return `Indexed ${payload.files_indexed} files (${payload.chunks_indexed} chunks).`;
    }

    if (ingestMutation.isError) {
      return "Unable to index repository. Check the URL and try again.";
    }

    return null;
  }, [ingestMutation.data, ingestMutation.isError, ingestMutation.isPending, ingestMutation.isSuccess]);

  const chatStatus = useMemo(() => {
    if (chatMutation.isPending) {
      return "Asking the assistant...";
    }

    if (chatMutation.isError) {
      return "Unable to reach the chat service. Try again.";
    }

    return null;
  }, [chatMutation.isError, chatMutation.isPending]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_-40px_var(--shadow)]">
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_var(--surface-strong),_transparent_70%)] opacity-70" />
      <div className="relative flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
            Analyze repository
          </p>
          <h1 className="text-3xl font-semibold text-[var(--text-strong)]">
            Paste a public repo, index it, and chat with the context.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            Index a GitHub repository, search it, and ask questions in the same
            workspace.
          </p>
        </header>

        <form
          className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmedRepo = repoUrl.trim();
            if (!trimmedRepo || ingestMutation.isPending) {
              return;
            }

            ingestMutation.mutate({
              repo_url: trimmedRepo,
              branch: branch.trim() || undefined,
            });
          }}
        >
          <div className="flex flex-col gap-3">
            <label
              htmlFor="repo-url"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]"
            >
              Repository URL
            </label>
            <input
              id="repo-url"
              type="url"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label
                htmlFor="repo-branch"
                className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]"
              >
                Branch (optional)
              </label>
              <input
                id="repo-branch"
                type="text"
                placeholder="main"
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                className="mt-3 h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={ingestMutation.isPending}
              className="mt-6 rounded-2xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_var(--accent-strong)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_44px_-18px_var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] sm:mt-0"
            >
              {ingestMutation.isPending ? "Indexing" : "Index repo"}
            </button>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Public GitHub repos only. Max 200 MB.
          </p>
          {ingestStatus ? (
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {ingestStatus}
            </p>
          ) : null}
        </form>

        <SearchForm
          value={query}
          onChange={setQuery}
          onSubmit={() => setSubmittedQuery(query.trim())}
        />

        <SearchResults
          isLoading={isLoading}
          errorMessage={errorMessage}
          results={data?.results ?? []}
        />

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              RAG chat
            </p>
            <h2 className="text-xl font-semibold text-[var(--text-strong)]">
              Ask questions against the indexed repo.
            </h2>
          </div>

          <div className="mt-6 grid gap-4">
            {turns.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
                Start a conversation after indexing a repository.
              </div>
            ) : (
              turns.map((turn, index) => (
                <div key={`${turn.user}-${index}`} className="grid gap-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      You
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-strong)]">
                      {turn.user}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      Assistant
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-strong)]">
                      {turn.assistant}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form
            className="mt-6 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = question.trim();
              if (!trimmed || chatMutation.isPending) {
                return;
              }

              chatMutation.mutate(
                {
                  question: trimmed,
                  history: turns,
                },
                {
                  onSuccess: (response) => {
                    setTurns((current) => [
                      ...current,
                      { user: trimmed, assistant: response.answer },
                    ]);
                  },
                }
              );

              setQuestion("");
            }}
          >
            <label
              htmlFor="chat-input"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]"
            >
              Ask a question
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                id="chat-input"
                rows={2}
                placeholder="Ask about architecture, ownership, or impact"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="min-h-[96px] w-full flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={chatMutation.isPending}
                className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_var(--accent-strong)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_44px_-18px_var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                {chatMutation.isPending ? "Sending" : "Send"}
              </button>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Responses include file paths and confidence scores.
            </p>
            {chatStatus ? (
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                {chatStatus}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </section>
  );
}
