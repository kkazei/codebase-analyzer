import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from "react";

import type { ChatTurn } from "@/features/chat";
import { useChat } from "@/features/chat";
import { ingestService, useAnalyzeRepo, useIngest } from "@/features/ingest";
import { SearchForm, SearchResults, useSearch } from "@/features/search";
import { API_BASE_URL } from "@/shared/utils/apiClient";

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

type ConversationTurn = ChatTurn & {
  sources: Record<string, unknown>[];
};

function getSourcePaths(sources: Record<string, unknown>[]): string[] {
  return [...new Set(sources
    .map((source) => source.path)
    .filter((path): path is string => typeof path === "string" && path.length > 0))]
    .slice(0, 4);
}

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

function renderTree(nodes: TreeNode[], depth = 0): ReactElement {
  return (
    <ul className="grid gap-1">
      {nodes.map((node) => (
        <li key={`${node.type}-${node.name}`} className="min-w-0">
          {node.type === "folder" ? (
            <details open={depth === 0} className="group">
              <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-sm text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] [&::-webkit-details-marker]:hidden">
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-[var(--accent)]" fill="none">
                  <path d="M1.75 4.75h4l1.4 1.5h7.1v6.5h-12.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
                  <path d="M1.75 6.25h12.5" stroke="currentColor" strokeWidth="1.25" />
                </svg>
                <span className="min-w-0 break-all font-mono text-[13px]">{node.name}</span>
                <span aria-hidden="true" className="ml-auto text-xs text-[var(--text-muted)] transition-transform group-open:rotate-90">›</span>
              </summary>
              {node.children.length > 0 ? (
                <div className="ml-4 border-l border-[var(--border)] pl-2">{renderTree(node.children, depth + 1)}</div>
              ) : null}
            </details>
          ) : (
            <div className="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-[var(--text-muted)]" fill="none">
                <path d="M3.25 1.75h6l3.5 3.5v9h-9.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
                <path d="M9.25 1.75v3.5h3.5" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
              </svg>
              <span className="min-w-0 break-all font-mono text-[13px]">{node.name}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function getChatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (["network error", "failed to fetch"].includes(error.message.toLowerCase())) {
      const apiTarget = API_BASE_URL || `${window.location.origin}/api/v1`;
      const nextStep = import.meta.env.DEV
        ? "Check that the backend is running."
        : "Check the deployment's VITE_API_BASE_URL or its /api/v1 reverse-proxy route.";
      return `Can't connect to the chat API at ${apiTarget}. ${nextStep}`;
    }

    if (error.message.toLowerCase().includes("timeout")) {
      return "Hugging Face Inference took too long to answer. Check the configured model's provider status, then retry.";
    }
  }

  return getApiErrorMessage(error, "The chat request failed. Check the backend and retry.");
}

function TypingIndicator(): ReactElement {
  return (
    <div className="message-enter grid gap-1.5" role="status" aria-label="CodeLens is reading the indexed code">
      <p className="text-xs font-medium text-[var(--text-muted)]">CodeLens</p>
      <div className="flex h-9 w-fit items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="sr-only">Thinking through the indexed code</span>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const [analyzedKey, setAnalyzedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "structure">("summary");
  const [ingestJobId, setIngestJobId] = useState<string | null>(null);
  const [autoIndexKey, setAutoIndexKey] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const chatToggleRef = useRef<HTMLButtonElement | null>(null);
  const analyzeMutation = useAnalyzeRepo();
  const ingestMutation = useIngest();
  const chatMutation = useChat();
  const trimmedRepo = repoUrl.trim();
  const trimmedBranch = branch.trim();
  const currentKey = `${trimmedRepo}::${trimmedBranch}`;
  const analysisReady = analyzeMutation.isSuccess && analyzedKey === currentKey;
  const scopedFilter = useMemo(() => {
    if (!analysisReady || !trimmedRepo) {
      return null;
    }

    return {
      repo_url: trimmedRepo,
    };
  }, [analysisReady, trimmedBranch, trimmedRepo]);
  const { data, isLoading, error } = useSearch(submittedQuery, 5, scopedFilter);
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
      if (payload.reused) {
        return `Using existing index (${payload.chunks_indexed} chunks).`;
      }
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
      return "Thinking through the indexed code…";
    }

    if (chatMutation.isError) {
      return getChatErrorMessage(chatMutation.error);
    }

    return null;
  }, [chatMutation.error, chatMutation.isError, chatMutation.isPending]);

  const repoLabel =
    analyzeMutation.data?.repo ?? ingestMutation.data?.repo ?? "No repo selected";
  const branchLabel =
    analyzeMutation.data?.branch ?? ingestMutation.data?.branch ?? "-";
  const fileCount = analyzeMutation.data?.file_count ?? 0;
  const chunkCount = ingestMutation.data?.chunks_indexed ?? 0;
  const indexedFiles = ingestMutation.data?.files_indexed ?? 0;
  const structureTree = buildFileTree(analyzeMutation.data?.file_paths ?? []);
  const chatReady = ingestMutation.isSuccess;

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

  const runIngest = (nextRepo?: string, nextBranch?: string) => {
    const repoValue = (nextRepo ?? repoUrl).trim();
    const branchValue = (nextBranch ?? branch).trim();
    if (!repoValue || ingestMutation.isPending) {
      return;
    }

    const nextJobId = crypto.randomUUID();
    setIngestJobId(nextJobId);
    setAutoIndexKey(`${repoValue}::${branchValue}`);
    setProgressPercent(0);
    setProgressLabel("Starting index...");
    ingestMutation.mutate({
      repo_url: repoValue,
      branch: branchValue || undefined,
      job_id: nextJobId,
    });
  };

  const resetRepoSession = () => {
    setRepoUrl("");
    setBranch("");
    setAnalyzedKey(null);
    setIngestJobId(null);
    setAutoIndexKey(null);
    setProgressPercent(0);
    setProgressLabel("");
    setQuery("");
    setSubmittedQuery("");
    setActiveTab("summary");
    setTurns([]);
    setFailedQuestion(null);
    setQuestion("");
    analyzeMutation.reset();
    ingestMutation.reset();
    chatMutation.reset();
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

  useEffect(() => {
    if (!isChatOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsChatOpen(false);
        chatToggleRef.current?.focus();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isChatOpen]);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (!conversation || !isChatOpen) {
      return;
    }

    conversation.scrollTo({
      top: conversation.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [turns, failedQuestion, chatMutation.isPending, isChatOpen]);

  const submitQuestion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending) {
      return;
    }

    setFailedQuestion(null);
    chatMutation.mutate(
      {
        question: trimmed,
        history: turns.map(({ user, assistant }) => ({ user, assistant })),
        filter: scopedFilter,
      },
      {
        onSuccess: (response) => {
          setFailedQuestion(null);
          setTurns((current) => [
            ...current,
            { user: trimmed, assistant: response.answer, sources: response.sources },
          ]);
        },
        onError: () => setFailedQuestion(trimmed),
      }
    );

    setQuestion("");
  };

  return (
    <section className="grid gap-7">
      <header className="max-w-3xl">
        <h1 className="text-enter text-3xl font-semibold leading-tight tracking-[-0.03em] text-[var(--text-strong)] sm:text-4xl">
          Understand a codebase before you dive in.
        </h1>
        <p className="text-enter text-enter-delayed mt-3 max-w-2xl text-base leading-7 text-[var(--text-muted)]">
          Analyze a GitHub repository, explore its structure and search across its code.
        </p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <aside aria-labelledby="repository-source-title" className="grid gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div>
            <h2 id="repository-source-title" className="text-base font-semibold text-[var(--text-strong)]">
              Repository source
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
              Paste a GitHub URL to inspect files and prepare code search.
            </p>
          </div>

          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              runAnalyze();
            }}
          >
            <div className="grid gap-2">
              <label htmlFor="repo-url" className="text-sm font-medium text-[var(--text)]">
                GitHub repository URL
              </label>
              <input
                id="repo-url"
                type="url"
                required
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(event) => setRepoUrl(event.target.value)}
                disabled={analysisReady || analyzeMutation.isPending}
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="repo-branch" className="text-sm font-medium text-[var(--text)]">
                Branch <span className="font-normal text-[var(--text-muted)]">(optional)</span>
              </label>
              <input
                id="repo-branch"
                type="text"
                placeholder="main"
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                disabled={analysisReady || analyzeMutation.isPending}
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={!repoUrl.trim() || analyzeMutation.isPending}
              className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzeMutation.isPending
                ? "Analyzing repository…"
                : analysisReady
                  ? "Reanalyze repository"
                  : "Analyze repository"}
            </button>

            {analysisReady ? (
              <button
                type="button"
                onClick={resetRepoSession}
                className="min-h-10 rounded-lg px-3 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-strong)] hover:text-[var(--text-strong)]"
              >
                Change repository
              </button>
            ) : null}
          </form>

          {analysisReady ? (
            <div className="grid gap-2 border-t border-[var(--border)] pt-4">
              <p className="text-sm font-medium text-[var(--text-strong)]">Code search index</p>
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                {ingestMutation.isPending
                  ? "Preparing indexed files for semantic search and chat."
                  : ingestMutation.isSuccess
                    ? `${indexedFiles.toLocaleString()} files are ready for search and chat.`
                    : "Refresh the index to search this repository and ask questions about its code."}
              </p>
              <button
                type="button"
                onClick={() => runIngest()}
                disabled={ingestMutation.isPending}
                className="mt-1 min-h-10 w-fit rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ingestMutation.isPending ? "Indexing…" : "Reindex repository"}
              </button>
            </div>
          ) : null}

          {ingestJobId ? (
            <div className="grid gap-2" aria-live="polite">
              <div
                role="progressbar"
                aria-label="Repository indexing progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-strong)]"
                style={{ "--progress": `${progressPercent}%` } as CSSProperties}
              >
                <div
                  className="h-full w-[var(--progress)] rounded-full bg-[var(--accent)] transition-[width] duration-300"
                />
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {progressLabel || "Preparing repository index…"}
              </p>
            </div>
          ) : null}
          {ingestStatus ? (
            <p role={ingestMutation.isError ? "alert" : "status"} className={`text-sm leading-6 ${ingestMutation.isError ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>
              {ingestStatus}
            </p>
          ) : null}
          {analyzeStatus ? (
            <p role={analyzeMutation.isError ? "alert" : "status"} className={`text-sm leading-6 ${analyzeMutation.isError ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>
              {analyzeStatus}
            </p>
          ) : null}
        </aside>

        <div className="min-w-0">
          {analysisReady ? (
            <div className="grid gap-5">
              <header className="flex min-w-0 flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-muted)]">Repository</p>
                  <h2 className="mt-1 break-all font-mono text-xl font-medium tracking-tight text-[var(--text-strong)]">
                    {repoLabel}
                  </h2>
                </div>
                <p className="shrink-0 text-sm text-[var(--text-muted)]">
                  {fileCount.toLocaleString()} files <span aria-hidden="true">/</span> branch {branchLabel}
                </p>
              </header>

              <nav
                role="tablist"
                aria-label="Repository views"
                className="flex w-fit max-w-full items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1"
              >
                {([
                  { id: "summary", label: "Overview" },
                  { id: "structure", label: "File structure" },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    id={`${tab.id}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`${tab.id}-panel`}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                        event.preventDefault();
                        const nextTab = tab.id === "summary" ? "structure" : "summary";
                        setActiveTab(nextTab);
                        document.getElementById(`${nextTab}-tab`)?.focus();
                      }
                    }}
                    className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      activeTab === tab.id
                        ? "bg-[var(--surface-strong)] text-[var(--text-strong)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              {activeTab === "summary" ? (
                <section
                  id="summary-panel"
                  role="tabpanel"
                  aria-labelledby="summary-tab"
                  tabIndex={0}
                  className="panel-enter grid gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
                >
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-strong)]">Repository overview</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                      This repository contains {fileCount.toLocaleString()} files across {formatBytes(analyzeMutation.data.total_bytes)}.
                    </p>
                  </div>

                  <dl className="grid gap-4 border-y border-[var(--border)] py-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-sm text-[var(--text-muted)]">Files</dt>
                      <dd className="mt-1 text-lg font-medium tabular-nums text-[var(--text-strong)]">{fileCount.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-[var(--text-muted)]">Repository size</dt>
                      <dd className="mt-1 text-lg font-medium tabular-nums text-[var(--text-strong)]">{formatBytes(analyzeMutation.data.total_bytes)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-[var(--text-muted)]">Indexed chunks</dt>
                      <dd className="mt-1 text-lg font-medium tabular-nums text-[var(--text-strong)]">
                        {ingestMutation.isSuccess ? chunkCount.toLocaleString() : ingestMutation.isPending ? "Indexing" : "Not indexed"}
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-strong)]">Top-level entries</h3>
                    <p className="mt-2 break-words font-mono text-[13px] leading-6 text-[var(--text-muted)]">
                      {analyzeMutation.data.top_level_entries.length > 0
                        ? analyzeMutation.data.top_level_entries.join("  /  ")
                        : "No top-level entries were found."}
                    </p>
                  </div>

                  <div className="grid gap-4 border-t border-[var(--border)] pt-5">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-strong)]">Search the code</h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        Find a symbol, path or behavior across indexed files.
                      </p>
                    </div>
                    <SearchForm
                      value={query}
                      onChange={setQuery}
                      onSubmit={() => setSubmittedQuery(query.trim())}
                      disabled={!chatReady}
                      isLoading={isLoading}
                    />
                    {!chatReady ? (
                      <p role="status" className="text-sm text-[var(--text-muted)]">
                        Search will be available when indexing finishes.
                      </p>
                    ) : null}
                    {chatReady ? (
                      <SearchResults
                        isLoading={isLoading}
                        errorMessage={errorMessage}
                        results={data?.results ?? []}
                        hasSearched={submittedQuery.length > 0}
                      />
                    ) : null}
                  </div>
                </section>
              ) : (
                <section
                  id="structure-panel"
                  role="tabpanel"
                  aria-labelledby="structure-tab"
                  tabIndex={0}
                  className="panel-enter grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
                >
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-strong)]">File structure</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Expand folders to follow how this repository is organized.
                    </p>
                  </div>
                  {structureTree.length > 0 ? (
                    <div className="max-h-[min(62vh,680px)] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 sm:p-4">
                      <div className="grid gap-1">{renderTree(structureTree)}</div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                      Repository analysis did not return a file list. Reanalyze the repository to try again.
                    </div>
                  )}
                </section>
              )}
            </div>
          ) : (
            <div className="flex min-h-[340px] flex-col justify-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-8 sm:px-8">
              <h2 className="text-lg font-semibold text-[var(--text-strong)]">Your repository overview will appear here</h2>
              <p className="max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                Analyze a repository to inspect its files, explore the folder structure, then search and ask questions about the indexed code.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-40 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[400px]">
        <div className="flex justify-end">
          <button
            ref={chatToggleRef}
            type="button"
            aria-expanded={isChatOpen}
            aria-controls="codebase-chat-panel"
            onClick={() => setIsChatOpen((current) => !current)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:translate-y-0"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              <path d="M3 4.75A2.25 2.25 0 0 1 5.25 2.5h9.5A2.25 2.25 0 0 1 17 4.75v6.5a2.25 2.25 0 0 1-2.25 2.25H8l-4.5 4v-4.35A2.25 2.25 0 0 1 3 11.25z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M6.5 7.25h7M6.5 10h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {isChatOpen ? "Close chat" : "Ask about this code"}
          </button>
        </div>

        <div
          className="chat-panel-shell"
          data-open={isChatOpen}
          aria-hidden={!isChatOpen}
          inert={!isChatOpen}
        >
          <section
            id="codebase-chat-panel"
            aria-label="Codebase chat"
            className="flex max-h-[calc(100dvh-5rem)] min-h-[360px] flex-col gap-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.8)]"
          >
            <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                    <path d="M3 4.75A2.25 2.25 0 0 1 5.25 2.5h9.5A2.25 2.25 0 0 1 17 4.75v6.5a2.25 2.25 0 0 1-2.25 2.25H8l-4.5 4v-4.35A2.25 2.25 0 0 1 3 11.25z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M6.5 7.25h7M6.5 10h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-[var(--text-strong)]">Ask CodeLens</h2>
                  {analysisReady ? <p className="truncate font-mono text-[11px] text-[var(--text-muted)]">{repoLabel}</p> : null}
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <span className={`h-1.5 w-1.5 rounded-full ${chatReady ? "bg-[var(--accent)]" : "bg-[var(--text-muted)]"}`} aria-hidden="true" />
                {chatReady
                  ? "Ready"
                  : ingestMutation.isPending
                    ? "Indexing repository"
                    : analysisReady
                      ? "Preparing index"
                      : "No repository selected"}
              </span>
            </header>

            <div ref={conversationRef} className="min-h-0 flex-1 overflow-auto" aria-live="polite">
              {turns.length === 0 && !chatMutation.isPending && !failedQuestion ? (
                <div className="grid gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--accent)]">
                    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                      <path d="M3 4.75A2.25 2.25 0 0 1 5.25 2.5h9.5A2.25 2.25 0 0 1 17 4.75v6.5a2.25 2.25 0 0 1-2.25 2.25H8l-4.5 4v-4.35A2.25 2.25 0 0 1 3 11.25z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M6.5 7.25h7M6.5 10h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    {chatReady
                      ? "Ask about the codebase. Answers use its indexed files as context."
                      : "Analyze and index a repository before asking questions about its code."}
                  </p>
                  {chatReady ? (
                    <div className="grid gap-2">
                      {[
                        "What is this project for and how do I run it?",
                        "Walk me through the application entry point.",
                        "Where are the API routes defined?",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => submitQuestion(prompt)}
                          disabled={chatMutation.isPending}
                          className="group flex min-h-11 items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2 text-left text-sm text-[var(--text)] transition-[background-color,border-color,color,transform] duration-200 hover:translate-x-0.5 hover:border-[var(--accent)] hover:bg-[var(--surface-strong)] hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {prompt}
                          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" fill="none">
                            <path d="M3 8h10M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-5">
                  {turns.map((turn, index) => {
                    const sourcePaths = getSourcePaths(turn.sources);
                    return (
                    <div key={`${turn.user}-${index}`} className="message-enter grid gap-3">
                      <div className="ml-auto max-w-[90%] rounded-xl rounded-br-sm bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm text-[var(--text-strong)]">
                        <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">You</p>
                        <p className="break-words whitespace-pre-wrap">{turn.user}</p>
                      </div>
                      <div className="max-w-[92%] rounded-xl rounded-bl-sm border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-2.5 text-sm leading-6 text-[var(--text-strong)]">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                          CodeLens
                        </p>
                        <p className="break-words whitespace-pre-wrap">{turn.assistant}</p>
                        {sourcePaths.length > 0 ? (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-2">
                            <span className="text-[11px] text-[var(--text-muted)]">Sources</span>
                            {sourcePaths.map((path) => (
                              <span key={path} className="max-w-full truncate rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]" title={path}>
                                {path}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    );
                  })}
                  {chatMutation.isPending && chatMutation.variables?.question ? (
                    <div className="message-enter grid gap-3">
                      <div className="ml-auto max-w-[90%] rounded-xl rounded-br-sm bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm text-[var(--text-strong)]">
                        <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">You</p>
                        <p className="break-words whitespace-pre-wrap">{chatMutation.variables.question}</p>
                      </div>
                      <TypingIndicator />
                    </div>
                  ) : null}
                  {failedQuestion && chatMutation.isError ? (
                    <div className="message-enter grid gap-3">
                      <div className="ml-auto max-w-[90%] rounded-xl rounded-br-sm bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm text-[var(--text-strong)]">
                        <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">You</p>
                        <p className="break-words whitespace-pre-wrap">{failedQuestion}</p>
                      </div>
                      <div role="alert" className="max-w-[92%] rounded-xl rounded-bl-sm border border-[var(--danger)]/40 bg-[var(--surface-strong)] px-3.5 py-3 text-sm leading-6 text-[var(--text-strong)]">
                        <p className="mb-1 text-xs font-medium text-[var(--danger)]">CodeLens couldn’t reply</p>
                        <p>{chatStatus}</p>
                        <button
                          type="button"
                          onClick={() => submitQuestion(failedQuestion)}
                          className="mt-2 min-h-9 rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-strong)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        >
                          Retry message
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <form
              className="grid gap-2 border-t border-[var(--border)] pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                submitQuestion(question);
              }}
            >
              <label htmlFor="chat-input" className="text-sm font-medium text-[var(--text)]">
                Your question
              </label>
              <textarea
                id="chat-input"
                rows={3}
                placeholder={chatReady ? "Ask about a file, function or architecture" : "Index a repository to ask a question"}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitQuestion(question);
                  }
                }}
                disabled={!chatReady}
                className="min-h-20 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm leading-6 text-[var(--text-strong)] transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--text-muted)]">Enter to send, Shift+Enter for a new line</p>
                <button
                  type="submit"
                  disabled={!chatReady || chatMutation.isPending || !question.trim()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 text-sm font-semibold text-[var(--accent-contrast)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {chatMutation.isPending ? "Sending…" : "Send"}
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                    <path d="M2.5 8h10M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </section>
  );
}
