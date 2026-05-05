import { useMemo, useState } from "react";

import { useChat } from "@/features/chat";
import type { ChatTurn } from "@/features/chat";

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const chatMutation = useChat();

  const errorMessage = useMemo(() => {
    if (!chatMutation.isError) {
      return null;
    }

    return "Unable to reach the chat service. Try again.";
  }, [chatMutation.isError]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_-40px_var(--shadow)]">
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_var(--surface-strong),_transparent_70%)] opacity-70" />
      <div className="relative flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
            Conversational analysis
          </p>
          <h1 className="text-3xl font-semibold text-[var(--text-strong)]">
            Ask questions. Trace answers. Keep context.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            The assistant understands the repository structure and can point to
            the most relevant files while you explore trade-offs.
          </p>
        </header>

        <div className="grid gap-4">
          {turns.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 text-sm text-[var(--text-muted)]">
              Start a conversation to see responses here.
            </div>
          ) : (
            turns.map((turn, index) => (
              <div key={`${turn.user}-${index}`} className="grid gap-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    You
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-strong)]">
                    {turn.user}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
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
          className="flex flex-col gap-3"
          aria-label="Ask the assistant"
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
              placeholder="Ask about architecture, dependencies, or impact"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="min-h-[96px] w-full flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
          {errorMessage ? (
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {errorMessage}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
