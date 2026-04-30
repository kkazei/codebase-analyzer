import { FormEvent, useState } from "react";

import { useAnalyzeRepository } from "../hooks/useAnalyzeRepository";
import { useIndexRepository } from "../hooks/useIndexRepository";
import { useRepositoryChat } from "../hooks/useRepositoryChat";
import type { TreeNode } from "../types";

const DEFAULT_REPOSITORY_URL = "https://github.com/tiangolo/fastapi";

export function RepositoryAnalyzerPanel() {
  const [repositoryUrl, setRepositoryUrl] = useState(DEFAULT_REPOSITORY_URL);
  const [maxFiles, setMaxFiles] = useState(300);
  const [chunkSize, setChunkSize] = useState(1200);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [topK, setTopK] = useState(5);
  const [question, setQuestion] = useState("");

  const analyzeMutation = useAnalyzeRepository();
  const indexMutation = useIndexRepository();
  const chatMutation = useRepositoryChat();
  const result = analyzeMutation.data;
  const indexResult = indexMutation.data;

  const analyzeError = getErrorMessage(analyzeMutation.error);
  const indexError = getErrorMessage(indexMutation.error);
  const chatError = getErrorMessage(chatMutation.error);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    analyzeMutation.mutate({
      repository_url: repositoryUrl.trim(),
      max_files: maxFiles,
    });
  }

  function handleIndexRepository() {
    indexMutation.mutate({
      repository_url: repositoryUrl.trim(),
      max_files: maxFiles,
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
    });
  }

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    chatMutation.mutate({
      repository_url: repositoryUrl.trim(),
      question: question.trim(),
      top_k: topK,
    });
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-700 bg-slate-900/70 p-6"
      >
        <div>
          <label
            htmlFor="repository-url"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            Public GitHub Repository URL
          </label>
          <input
            id="repository-url"
            type="url"
            required
            value={repositoryUrl}
            onChange={(event) => setRepositoryUrl(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400 transition focus:ring-2"
            placeholder="https://github.com/owner/repo"
          />
        </div>

        <div>
          <label
            htmlFor="max-files"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            Max Files To Analyze
          </label>
          <input
            id="max-files"
            type="number"
            min={10}
            max={2000}
            value={maxFiles}
            onChange={(event) => setMaxFiles(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400 transition focus:ring-2"
          />
        </div>

        <div className="grid gap-4">
          <div>
            <label
              htmlFor="chunk-size"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Chunk Size
            </label>
            <input
              id="chunk-size"
              type="number"
              min={200}
              max={4000}
              value={chunkSize}
              onChange={(event) => setChunkSize(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400 transition focus:ring-2"
            />
          </div>
          <div>
            <label
              htmlFor="chunk-overlap"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Chunk Overlap
            </label>
            <input
              id="chunk-overlap"
              type="number"
              min={0}
              max={1000}
              value={chunkOverlap}
              onChange={(event) => setChunkOverlap(Number(event.target.value))}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400 transition focus:ring-2"
            />
          </div>
        </div>

        <div className="grid gap-3">
          <button
            type="submit"
            disabled={analyzeMutation.isPending}
            className="inline-flex w-full items-center justify-center rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze Repository"}
          </button>
          <button
            type="button"
            onClick={handleIndexRepository}
            disabled={indexMutation.isPending}
            className="inline-flex w-full items-center justify-center rounded-lg border border-cyan-400 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {indexMutation.isPending ? "Indexing..." : "Index Repository For RAG"}
          </button>
        </div>
      </form>

      <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
        {!result && !analyzeMutation.isPending && !analyzeError && (
          <p className="text-sm text-slate-300">
            Submit a repository URL to get codebase metrics, language breakdown,
            and a generated summary.
          </p>
        )}

        {analyzeError && (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {analyzeError}
          </p>
        )}

        {result && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-white">Analysis Result</h2>
            <p className="text-sm leading-6 text-slate-300">{result.summary}</p>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <dt className="text-slate-400">Files</dt>
                <dd className="text-lg font-semibold text-white">
                  {result.total_files}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <dt className="text-slate-400">Lines</dt>
                <dd className="text-lg font-semibold text-white">
                  {result.total_lines}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-200">
                Top Languages
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {result.languages.map((language) => (
                  <li
                    key={language.language}
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2"
                  >
                    <span>{language.language}</span>
                    <span>{language.files} files</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-200">
                Top Directories
              </h3>
              <p className="text-sm text-slate-300">
                {result.top_directories.join(", ") || "No directories detected."}
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-200">
                Repository Tree
              </h3>
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-300">
                <RepositoryTree node={result.repository_tree} depth={0} />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-200">
                Key Files
              </h3>
              <ul className="space-y-3">
                {result.key_files.map((file) => (
                  <li
                    key={file.path}
                    className="rounded-lg border border-slate-700 bg-slate-950/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-white">{file.path}</span>
                      <span className="text-slate-400">
                        {file.language} · {file.lines} lines
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {file.preview || "No preview available."}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4 border-t border-slate-700 pt-6">
          <h2 className="text-lg font-semibold text-white">RAG Indexing</h2>
          {indexError && (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {indexError}
            </p>
          )}
          {indexResult && (
            <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-300">
              <p>{indexResult.summary}</p>
              <p>
                Namespace: <span className="text-cyan-200">{indexResult.namespace}</span>
              </p>
              <p>
                Files indexed: {indexResult.files_indexed} | Chunks indexed:{" "}
                {indexResult.chunks_indexed}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-4 border-t border-slate-700 pt-6">
          <h2 className="text-lg font-semibold text-white">RAG Chat</h2>
          <form onSubmit={handleChatSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="chat-question"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Ask a repository question
              </label>
              <textarea
                id="chat-question"
                required
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="min-h-24 w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400 transition focus:ring-2"
                placeholder="What does this project architecture look like?"
              />
            </div>
            <div>
              <label
                htmlFor="chat-top-k"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Retrieval Top K
              </label>
              <input
                id="chat-top-k"
                type="number"
                min={1}
                max={20}
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400 transition focus:ring-2"
              />
            </div>
            <button
              type="submit"
              disabled={chatMutation.isPending}
              className="inline-flex w-full items-center justify-center rounded-lg bg-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {chatMutation.isPending ? "Generating..." : "Ask RAG"}
            </button>
          </form>

          {chatError && (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {chatError}
            </p>
          )}

          {chatMutation.data && (
            <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
              <p className="text-sm leading-6 text-slate-200">{chatMutation.data.answer}</p>
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-200">Sources</h3>
                <ul className="space-y-2">
                  {chatMutation.data.sources.map((source) => (
                    <li
                      key={`${source.path}-${source.chunk_index}`}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300"
                    >
                      <p className="font-medium text-slate-100">
                        {source.path} (chunk {source.chunk_index}, score {source.score.toFixed(3)})
                      </p>
                      <p className="mt-1 leading-5 text-slate-300">{source.preview}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

function getErrorMessage(error: unknown): string {
  if (!error) {
    return "";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof (error as { detail?: unknown }).detail === "string"
  ) {
    return (error as { detail: string }).detail;
  }
  return "Request failed.";
}

interface RepositoryTreeProps {
  node: TreeNode;
  depth: number;
}

function RepositoryTree({ node, depth }: RepositoryTreeProps) {
  const indentClasses = ["", "pl-3", "pl-6", "pl-9", "pl-12", "pl-14", "pl-16"];
  const indentClass = indentClasses[Math.min(depth, indentClasses.length - 1)];

  return (
    <div className={`space-y-1 ${indentClass}`}>
      <div className={node.kind === "directory" ? "text-cyan-200" : "text-slate-300"}>
        {node.kind === "directory" ? "▾ " : "• "}
        {node.name}
      </div>
      {node.children.map((child) => (
        <RepositoryTree key={`${depth}-${child.name}-${child.kind}`} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
