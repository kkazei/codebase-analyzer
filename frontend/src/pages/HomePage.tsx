export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-10 shadow-2xl shadow-cyan-950/30">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
          Codebase Analyzer
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
          Your full-stack AI workspace is ready.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-300">
          This is the initial scaffold. Next, we can add ingestion, embedding,
          retrieval, and chat features.
        </p>
      </section>
    </main>
  );
}
