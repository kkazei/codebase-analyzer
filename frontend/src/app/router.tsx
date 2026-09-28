import { Suspense, lazy, useEffect, useState } from "react";
import {
  createBrowserRouter,
  NavLink,
  Outlet,
} from "react-router-dom";

import NotFoundPage from "../pages/NotFoundPage";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "codelens-theme";

const SearchPage = lazy(() => import("../pages/SearchPage"));

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : "dark";
  } catch {
    return "dark";
  }
}

function RootLayout() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(`theme-${theme}`);
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute("content", theme === "dark" ? "#11181b" : "#f0f4f3");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The in-memory theme remains usable when storage is unavailable.
    }
  }, [theme]);

  const nextThemeLabel = theme === "dark" ? "light" : "dark";

  return (
    <div className="min-h-screen text-[var(--text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_84%,transparent)] backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[linear-gradient(145deg,_color-mix(in_srgb,var(--accent)_18%,var(--surface-strong)),_var(--surface-strong))] shadow-[inset_0_1px_0_color-mix(in_srgb,white_12%,transparent)]">
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
              <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
                CodeLens
              </p>
              <p className="hidden text-xs text-[var(--text-muted)] sm:block">
                Repository workspace
              </p>
            </div>
          </div>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 sm:flex">
            {[
              { to: "/", label: "Analyze" },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    isActive
                      ? "bg-[var(--surface-strong)] text-[var(--text-strong)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"
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
            aria-pressed={theme === "dark"}
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
            className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              {theme === "dark" ? (
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
              ) : (
                <path
                  d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              )}
              {theme === "dark" ? (
                <path
                  d="M12 2.5v2M12 19.5v2M4.8 4.8l1.4 1.4M17.8 17.8l1.4 1.4M2.5 12h2M19.5 12h2M4.8 19.2l1.4-1.4M17.8 6.2l1.4-1.4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : null}
            </svg>
            <span className="capitalize">{theme}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-10 sm:px-7 sm:pt-12 lg:px-10 lg:pt-14">
        <Suspense
          fallback={
            <div role="status" className="glass-surface rounded-2xl border p-6 text-sm text-[var(--text-muted)]">
              Opening the repository workspace…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-5 py-5 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <span>CodeLens repository workspace</span>
          <span>Analyze, map and search your code</span>
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
