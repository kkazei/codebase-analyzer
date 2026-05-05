import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  createBrowserRouter,
  NavLink,
  Outlet,
} from "react-router-dom";

import NotFoundPage from "../pages/NotFoundPage";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "codebase-analyzer-theme";

const HomePage = lazy(() => import("../pages/HomePage"));
const SearchPage = lazy(() => import("../pages/SearchPage"));
const ChatPage = lazy(() => import("../pages/ChatPage"));

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function RootLayout() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : getPreferredTheme();

    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(`theme-${theme}`);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const nextThemeLabel = useMemo(
    () => (theme === "dark" ? "Light" : "Dark"),
    [theme]
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_-15px_var(--shadow)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                Codebase Analyzer
              </p>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Github-inspired AI Studio
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] sm:flex">
            {[
              { to: "/", label: "Home" },
              { to: "/search", label: "Analyze" },
              { to: "/chat", label: "Chat" },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `transition hover:text-[var(--text-strong)] ${
                    isActive ? "text-[var(--text-strong)]" : ""
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            aria-label={`Switch to ${nextThemeLabel} mode`}
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
            className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            Theme
            <span className="rounded-full bg-[var(--surface-strong)] px-2 py-1 text-[10px] text-[var(--text-strong)]">
              {nextThemeLabel}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <Suspense
          fallback={
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-sm text-[var(--text-muted)]">
              Loading view...
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>Built for serious teams</span>
          <span>Github palette, custom UX</span>
        </div>
      </footer>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "search", element: <SearchPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
