import { RepositoryAnalyzerPanel } from "../features/analyze/components/RepositoryAnalyzerPanel";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-cyan-950/30">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
          Codebase Analyzer
        </p>
        <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
          Analyze any public GitHub repository from a single link.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-300">
          Analyze structure, index repository chunks in Pinecone, then ask
          repository questions with HuggingFace-powered RAG chat.
        </p>

        <RepositoryAnalyzerPanel />
      </section>
    </main>
  );
}
