"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/utils/cn";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("theme");

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const preferredTheme = getPreferredTheme();
    document.documentElement.classList.toggle("dark", preferredTheme === "dark");
    document.documentElement.dataset.theme = preferredTheme;
    setTheme(preferredTheme);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-white/80 text-[color:var(--text)] transition hover:-translate-y-0.5 hover:border-blue-500/35 hover:text-blue-600 dark:bg-white/5",
        !mounted && "opacity-0",
      )}
    >
      {theme === "dark" ? <SunMedium size={18} /> : <MoonStar size={18} />}
    </button>
  );
}
