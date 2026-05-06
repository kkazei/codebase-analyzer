import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  createBrowserRouter,
  NavLink,
  Outlet,
} from "react-router-dom";

import NotFoundPage from "../pages/NotFoundPage";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "codelens-theme";

const SearchPage = lazy(() => import("../pages/SearchPage"));

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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_-15px_var(--shadow)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 48 48"
                className="h-6 w-6 text-[var(--accent)]"
                fill="none"
              >
                <circle cx="20" cy="20" r="10" stroke="currentColor" strokeWidth="3" />
                <path
                  d="M28 28L40 40"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="20" cy="20" r="4" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                CodeLens
              </p>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                Code intelligence studio
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] sm:flex">
            {[
              { to: "/", label: "Analyze" },
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
            className="group flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-strong)] text-[var(--text-strong)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`h-4 w-4 transition-all ${
                  theme === "dark"
                    ? "-translate-y-6 opacity-0"
                    : "translate-y-0 opacity-100"
                }`}
                fill="none"
              >
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 2V5M12 19V22M4.2 4.2L6.3 6.3M17.7 17.7L19.8 19.8M2 12H5M19 12H22M4.2 19.8L6.3 17.7M17.7 6.3L19.8 4.2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`absolute h-4 w-4 transition-all ${
                  theme === "dark"
                    ? "translate-y-0 opacity-100"
                    : "translate-y-6 opacity-0"
                }`}
                fill="none"
              >
                <path
                  d="M21 14.5C19.7 15.2 18.2 15.6 16.6 15.6C12.2 15.6 8.7 12.1 8.7 7.7C8.7 6.1 9.1 4.6 9.8 3.3C6.1 4.4 3.4 7.9 3.4 12C3.4 16.9 7.4 20.9 12.3 20.9C16.4 20.9 19.9 18.2 21 14.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
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
          <span>CodeLens</span>
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
      { index: true, element: <SearchPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
