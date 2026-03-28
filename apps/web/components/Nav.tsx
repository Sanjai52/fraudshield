"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Nav() {
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  // 🌙 Theme
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

  // 🔐 Auth
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null);
      });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const links = [
    { href: "/analyse", label: "Analyse" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/transparency", label: "How it works" },
  ];

  return (
    <nav
  className="sticky top-0 z-50 flex items-center justify-between px-8 py-3.5 border-b backdrop-blur-md"
  style={{
    background: "var(--nav-bg)",
    borderColor: "var(--border)"
  }}
>
      {/* Logo */}
      <Link href="/" className="font-bold text-base">
        🛡️ FraudShield
      </Link>

      {/* Links */}
      <div className="hidden sm:flex gap-6 text-sm">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`transition ${
              pathname === l.href ? "text-blue-500 font-semibold" : "text-gray-500"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">

        {/* Theme */}
        <button onClick={toggleTheme}>
          {dark ? "☀️" : "🌙"}
        </button>

        {/* Auth */}
        {loading ? null : user ? (
          <>
            <span className="text-sm">
              {user.user_metadata?.full_name || user.email}
            </span>

            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup" className="bg-blue-500 text-white px-3 py-1 rounded">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}