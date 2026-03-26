"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  active?: "analyse" | "dashboard" | "transparency";
}

export default function Nav({ active }: Props) {
  const [dark, setDark] = useState(false);

  // On mount, read saved preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const links = [
    { href: "/analyse", label: "Analyse", key: "analyse" },
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/transparency", label: "How it works", key: "transparency" },
  ] as const;

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-8 py-3.5 border-b"
      style={{
        background: "var(--nav-bg)",
        borderColor: "var(--border)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="font-bold text-base tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        FraudShield
      </Link>

      {/* Links */}
      <div className="hidden sm:flex items-center gap-6 text-sm">
        {links.map((l) => (
          <Link
            key={l.key}
            href={l.href}
            className="transition-colors"
            style={{
              color: active === l.key ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: active === l.key ? 600 : 400,
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? "☀️" : "🌙"}
        </button>

        {/* Login */}
        <Link
          href="/login"
          className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          style={{
            background: "var(--accent)",
            color: "#fff",
          }}
        >
          Log in
        </Link>
      </div>
    </nav>
  );
}
