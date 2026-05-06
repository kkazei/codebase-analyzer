import { useEffect, useMemo, useState, type CSSProperties } from "react";

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
  const [isChatOpen, setIsChatOpen] = useState(false);
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
      return "Asking the assistant...";
    }

    if (chatMutation.isError) {
      return "Unable to reach the chat service. Try again.";
    }

    return null;
  }, [chatMutation.isError, chatMutation.isPending]);

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
    setTurns([]);
    setQuestion("");
    analyzeMutation.reset();
    ingestMutation.reset();
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

  const submitQuestion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending) {
      return;
    }

    chatMutation.mutate(
      {
        question: trimmed,
        history: turns,
        filter: scopedFilter,
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
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_-40px_var(--shadow)]">
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_var(--accent-soft),_transparent_70%)] opacity-70" />
      <div className="absolute -right-16 top-16 hidden h-48 w-48 rounded-full bg-[var(--accent-soft)] blur-[80px] lg:block" />
      <div className="relative flex flex-col gap-8">
        <header className="flex flex-col gap-4 animate-fade-up">
          {analysisReady ? (
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              <span className="rounded-full border border-[var(--border)] px-3 py-1">{repoLabel}</span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1">{fileCount} files</span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1">{chunkCount} chunks</span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1">branch {branchLabel}</span>
            </div>
          ) : null}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-[0_16px_30px_-20px_var(--shadow)] float-slow">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 48 48"
                  className="h-6 w-6 text-[var(--accent)]"
                  fill="none"
                >
                  <path
                    d="M8 26C8 16.059 16.059 8 26 8C35.941 8 44 16.059 44 26"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M26 8L32 14"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="20" cy="28" r="9" stroke="currentColor" strokeWidth="3" />
                </svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
                Analyze repository
              </p>
            </div>
            <h1 className="text-3xl font-semibold text-[var(--text-strong)]">
              Paste a GitHub repo to summarize and map structure.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              After analysis completes, you will see the summary, structure, and search tools.
            </p>
          </div>
        </header>

        <form
          className="grid gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 animate-fade-up"
          onSubmit={(event) => event.preventDefault()}
        >
          <label
            htmlFor="repo-url"
            className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]"
          >
            Repository URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
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
              disabled={analysisReady}
              className={`h-14 w-full flex-1 rounded-2xl border px-4 text-base text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                analysisReady
                  ? "border-[var(--border)]/60 bg-[var(--surface-strong)]/70 text-[var(--text-muted)]"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            />
            <button
              type="button"
              onClick={resetRepoSession}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-strong)]"
            >
              Change repo
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="flex flex-col gap-3">
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
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </div>
            <button
              type="button"
              onClick={() => runAnalyze()}
              disabled={!repoUrl.trim() || analyzeMutation.isPending}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reanalyze
            </button>
            <button
              type="button"
              onClick={() => runIngest()}
              disabled={!repoUrl.trim() || ingestMutation.isPending}
              className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_18px_40px_-20px_var(--accent-strong)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_44px_-18px_var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reindex
            </button>
          </div>
          {ingestJobId ? (
            <div className="grid gap-2">
              <div
                className="progress-bar"
                style={{ "--progress": `${progressPercent}%` } as CSSProperties}
              >
                <div className="progress-bar-fill" />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                {progressLabel || "Preparing index"}
              </p>
            </div>
          ) : null}
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

        {analysisReady ? (
          <div className="grid gap-8 animate-fade-up">
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
                    across {formatBytes(analyzeMutation.data.total_bytes)}.
                    Use indexing when you want semantic search and chat responses.
                  </p>
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                    Key capabilities
                  </p>
                  <ul className="grid gap-2 text-sm text-[var(--text-strong)]">
                    <li>Top-level entries: {analyzeMutation.data.top_level_entries.join(", ")}</li>
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
                    Analyzed
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
        ) : (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
            Paste a GitHub repository URL to begin analysis. Summary, structure, and search results appear after analysis completes.
          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-4 right-4 z-40 sm:left-auto sm:right-6 sm:w-[420px]">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsChatOpen((current) => !current)}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-strong)] shadow-[0_18px_40px_-20px_var(--shadow)] transition hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            {isChatOpen ? "Close chat" : "Ask CodeLens"}
          </button>
        </div>

        {isChatOpen ? (
          <section className="mt-3 flex max-h-[75vh] min-h-[420px] flex-col gap-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_20px_50px_-35px_var(--shadow)] animate-fade-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 48 48"
                    className="h-5 w-5 text-[var(--accent)]"
                    fill="none"
                  >
                    <rect x="10" y="12" width="28" height="22" rx="6" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M16 20H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M16 26H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  Ask CodeLens
                </p>
              </div>
              <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                {chatReady ? "Ready" : "Indexing"}
              </span>
            </div>

            {turns.length === 0 ? (
              <div className="grid gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--text-muted)]">
                  Ask anything about this codebase. Responses are grounded in indexed files.
                </div>

                <div className="grid gap-2">
                  {[
                    "What is this project for and how do I run it?",
                    "Walk me through the entry point of the app.",
                    "Where are the API routes defined?",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submitQuestion(prompt)}
                      disabled={!chatReady || chatMutation.isPending}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-left text-xs text-[var(--text-strong)] transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex-1 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
              {turns.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-muted)]">
                  Start a conversation after indexing a repository.
                </div>
              ) : (
                <div className="grid gap-4">
                  {turns.map((turn, index) => (
                    <div key={`${turn.user}-${index}`} className="grid gap-3">
                      <div className="flex items-start justify-end gap-2">
                        <div className="max-w-[85%] rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm text-white shadow-[0_12px_30px_-20px_var(--shadow)] chat-pop">
                          <p className="break-words whitespace-pre-wrap">{turn.user}</p>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
                          You
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 48 48"
                            className="h-5 w-5 text-[var(--accent)]"
                            fill="none"
                          >
                            <rect x="10" y="12" width="28" height="22" rx="6" stroke="currentColor" strokeWidth="2.5" />
                            <path d="M18 19H30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M18 25H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div className="max-w-[85%] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-strong)] shadow-[0_12px_30px_-20px_var(--shadow)] chat-pop">
                          <p className="break-words whitespace-pre-wrap">{turn.assistant}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                submitQuestion(question);
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
                placeholder={
                  chatReady
                    ? "Ask about architecture, ownership, or impact"
                    : "Chat unlocks after indexing"
                }
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitQuestion(question);
                  }
                }}
                disabled={!chatReady}
                className="min-h-[96px] w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={!chatReady || chatMutation.isPending}
                className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_var(--accent-strong)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_44px_-18px_var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {chatMutation.isPending ? "Sending" : "Send"}
              </button>
              {chatStatus ? (
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  {chatStatus}
                </p>
              ) : null}
            </form>
          </section>
        ) : null}
      </div>
    </section>
  );
}
