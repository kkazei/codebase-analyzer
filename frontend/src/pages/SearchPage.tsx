import { useEffect, useMemo, useState } from "react";

import type { ChatTurn } from "@/features/chat";
import { useChat } from "@/features/chat";
import { ingestService, useAnalyzeRepo, useIngest } from "@/features/ingest";
import { SearchForm, SearchResults, useSearch } from "@/features/search";

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  return fallback;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

type TreeNode = {
  name: string;
  type: "file" | "folder";
  children: TreeNode[];
};

// Build a stable, deterministic tree for the Structure tab.
function buildFileTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  const findOrCreate = (
    nodes: TreeNode[],
    name: string,
    type: "file" | "folder"
  ): TreeNode => {
    const existing = nodes.find((node) => node.name === name);
    if (existing) {
      return existing;
    }

    const created: TreeNode = { name, type, children: [] };
    nodes.push(created);
    return created;
  };

  paths.forEach((path) => {
    const parts = path.split("/").filter(Boolean);
    let cursor = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const node = findOrCreate(cursor, part, isFile ? "file" : "folder");
      if (!isFile) {
        cursor = node.children;
      }
    });
  });

  const sortNodes = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((node) => ({
        ...node,
        children: sortNodes(node.children),
      }));

  return sortNodes(root);
}

function renderTree(nodes: TreeNode[]): JSX.Element {
  return (
    <ul className="grid gap-2">
      {nodes.map((node) => (
        <li key={`${node.type}-${node.name}`} className="grid gap-2">
          <div className="flex items-center gap-2 text-sm text-[var(--text-strong)]">
            <span className="text-[var(--text-muted)]">
              {node.type === "folder" ? "▸" : "·"}
            </span>
            <span>{node.name}</span>
          </div>
          {node.children.length > 0 ? (
            <div className="pl-4">{renderTree(node.children)}</div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [analyzedKey, setAnalyzedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "structure">("summary");
  const [ingestJobId, setIngestJobId] = useState<string | null>(null);
  const [autoIndexKey, setAutoIndexKey] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const { data, isLoading, error } = useSearch(submittedQuery);
  const analyzeMutation = useAnalyzeRepo();
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
      return getApiErrorMessage(
        ingestMutation.error,
        "Unable to index repository. Check the URL and try again."
      );
    }

    return null;
  }, [ingestMutation.data, ingestMutation.isError, ingestMutation.isPending, ingestMutation.isSuccess]);

  const analyzeStatus = useMemo(() => {
    if (analyzeMutation.isPending) {
      return "Analyzing repository...";
    }

    if (analyzeMutation.isError) {
      return getApiErrorMessage(
        analyzeMutation.error,
        "Unable to analyze repository. Check the URL and try again."
      );
    }

    return null;
  }, [analyzeMutation.error, analyzeMutation.isError, analyzeMutation.isPending]);

  const chatStatus = useMemo(() => {
    if (chatMutation.isPending) {
      return "Asking the assistant...";
    }

    if (chatMutation.isError) {
      return "Unable to reach the chat service. Try again.";
    }

    return null;
  }, [chatMutation.isError, chatMutation.isPending]);

  const currentKey = `${repoUrl.trim()}::${branch.trim()}`;
  const analysisReady = analyzeMutation.isSuccess && analyzedKey === currentKey;
  const trimmedRepo = repoUrl.trim();
  const trimmedBranch = branch.trim();
  const repoLabel =
    analyzeMutation.data?.repo ?? ingestMutation.data?.repo ?? "No repo selected";
  const branchLabel =
    analyzeMutation.data?.branch ?? ingestMutation.data?.branch ?? "-";
  const fileCount = analyzeMutation.data?.file_count ?? 0;
  const chunkCount = ingestMutation.data?.chunks_indexed ?? 0;
  const indexedFiles = ingestMutation.data?.files_indexed ?? 0;
  const structureTree = buildFileTree(analyzeMutation.data?.file_paths ?? []);

  const runAnalyze = (nextRepo?: string, nextBranch?: string) => {
    const repoValue = (nextRepo ?? repoUrl).trim();
    const branchValue = (nextBranch ?? branch).trim();

    if (!repoValue || analyzeMutation.isPending) {
      return;
    }

    analyzeMutation.mutate(
      {
        repo_url: repoValue,
        branch: branchValue || undefined,
      },
      {
        onSuccess: () => {
          setAnalyzedKey(`${repoValue}::${branchValue}`);
        },
      }
    );
  };

  useEffect(() => {
    if (!analysisReady || !trimmedRepo) {
      return;
    }

    if (autoIndexKey === currentKey) {
      return;
    }

    if (ingestMutation.isPending || ingestMutation.isSuccess) {
      return;
    }

    const nextJobId = crypto.randomUUID();
    setIngestJobId(nextJobId);
    setAutoIndexKey(currentKey);
    setProgressPercent(0);
    setProgressLabel("Starting index...");

    ingestMutation.mutate({
      repo_url: trimmedRepo,
      branch: trimmedBranch || undefined,
      job_id: nextJobId,
    });
  }, [analysisReady, ingestMutation, trimmedBranch, trimmedRepo]);

  useEffect(() => {
    if (!ingestJobId) {
      return;
    }

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const progress = await ingestService.progress(ingestJobId);
        if (!isMounted) {
          return;
        }
        setProgressPercent(progress.percent);
        setProgressLabel(
          `${progress.files_processed}/${progress.files_total} files · ${progress.chunks_indexed} chunks`
        );
        if (progress.status === "completed") {
          clearInterval(interval);
        }
        if (progress.status === "failed") {
          setProgressLabel("Index failed. Check backend logs for details.");
          clearInterval(interval);
        }
      } catch {
        // Ignore transient polling errors.
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [ingestJobId]);

  useEffect(() => {
    if (!ingestMutation.isError) {
      return;
    }
    setProgressLabel(
      getApiErrorMessage(ingestMutation.error, "Index failed. Check backend logs.")
    );
  }, [ingestMutation.error, ingestMutation.isError]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_-40px_var(--shadow)]">
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_var(--surface-strong),_transparent_70%)] opacity-70" />
      <div className="relative flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{repoLabel}</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{fileCount} files</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">{chunkCount} chunks</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">branch {branchLabel}</span>
            <button
              type="button"
              onClick={() => {
                setRepoUrl("");
                setBranch("");
                setAnalyzedKey(null);
                setIngestJobId(null);
                setAutoIndexKey(null);
                setProgressPercent(0);
                setProgressLabel("");
                analyzeMutation.reset();
                ingestMutation.reset();
              }}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-strong)]"
            >
              Change repo
            </button>
          </div>
          {ingestJobId ? (
            <div className="grid gap-2">
              <div
                className="progress-bar"
                style={{ "--progress": `${progressPercent}%` } as React.CSSProperties}
              >
                <div className="progress-bar-fill" />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                {progressLabel || "Preparing index"}
              </p>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
              Analyze repository
            </p>
            <h1 className="text-3xl font-semibold text-[var(--text-strong)]">
              Summarize, explore structure, and index automatically.
            </h1>
          </div>
        </header>

        <form
          className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5"
          onSubmit={(event) => event.preventDefault()}
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
              onBlur={() => runAnalyze()}
              onPaste={(event) => {
                const input = event.currentTarget;
                setTimeout(() => runAnalyze(input.value, branch), 0);
              }}
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
                onBlur={() => runAnalyze()}
                className="mt-3 h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Public GitHub repos only. Auto analyze + auto index enabled.
          </p>
          {ingestStatus ? (
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {ingestStatus}
            </p>
          ) : null}
          {analyzeStatus ? (
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {analyzeStatus}
            </p>
          ) : null}
        </form>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              {([
                { id: "summary", label: "Summary" },
                { id: "structure", label: "Structure" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                    activeTab === tab.id
                      ? "border-[var(--accent)] bg-[var(--surface-strong)] text-[var(--text-strong)]"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "summary" ? (
              <div className="grid gap-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                    What it does
                  </p>
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    This repository contains {fileCount.toLocaleString()} files
                    across {analysisReady ? formatBytes(analyzeMutation.data.total_bytes) : "-"}.
                    Use indexing when you want semantic search and chat responses.
                  </p>
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                    Key capabilities
                  </p>
                  <ul className="grid gap-2 text-sm text-[var(--text-strong)]">
                    <li>Top-level entries: {analysisReady ? analyzeMutation.data.top_level_entries.join(", ") : "-"}</li>
                    <li>Indexed files: {indexedFiles.toLocaleString()}</li>
                    <li>Indexed chunks: {chunkCount.toLocaleString()}</li>
                  </ul>
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                    Search the repo
                  </p>
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
                </div>
              </div>
            ) : (
              <div className="grid gap-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                    Structure
                  </p>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    {analysisReady ? "Analyzed" : "Pending"}
                  </span>
                </div>
                {structureTree.length > 0 ? (
                  <div className="max-h-[360px] overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                    <div className="grid gap-2">{renderTree(structureTree)}</div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--text-muted)]">
                    Index the repo to preview the file tree.
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-6">
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_20px_50px_-35px_var(--shadow)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  Ask Codebase
                </p>
                <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  Ready
                </span>
              </div>
              <div className="mt-4 grid gap-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--text-muted)]">
                  Ask anything about this codebase. Responses are grounded in indexed files.
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => setQuestion("What is this project for and how do I run it?")}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-left text-xs text-[var(--text-strong)]"
                  >
                    What is this project for and how do I run it?
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestion("Walk me through the entry point of the app.")}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-left text-xs text-[var(--text-strong)]"
                  >
                    Walk me through the entry point of the app.
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestion("Where are the API routes defined?")}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-left text-xs text-[var(--text-strong)]"
                  >
                    Where are the API routes defined?
                  </button>
                </div>
              </div>

              <form
                className="mt-4 grid gap-3"
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
                <textarea
                  id="chat-input"
                  rows={3}
                  placeholder="Ask about architecture, ownership, or impact"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  className="min-h-[96px] w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                />
                <button
                  type="submit"
                  disabled={chatMutation.isPending}
                  className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_var(--accent-strong)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_44px_-18px_var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                >
                  {chatMutation.isPending ? "Sending" : "Send"}
                </button>
                {chatStatus ? (
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    {chatStatus}
                  </p>
                ) : null}
              </form>

              <div className="mt-4 grid gap-3">
                {turns.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-xs text-[var(--text-muted)]">
                    Start a conversation after indexing a repository.
                  </div>
                ) : (
                  turns.map((turn, index) => (
                    <div key={`${turn.user}-${index}`} className="grid gap-2">
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--text-strong)]">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                          You
                        </p>
                        <p className="mt-2 text-sm text-[var(--text-strong)]">
                          {turn.user}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text-strong)]">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
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
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
