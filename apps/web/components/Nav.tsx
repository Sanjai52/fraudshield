"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/analyse",      label: "Analyse"      },
  { href: "/dashboard",    label: "Dashboard"    },
  { href: "/transparency", label: "How it works" },
];

export default function Nav() {
  const [dark,     setDark]     = useState(false);
  const [user,     setUser]     = useState<User | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [dropdown, setDropdown] = useState(false);

  const pathname = usePathname();
  const router   = useRouter();

 useEffect(() => {
    const saved  = localStorage.getItem("theme");
    // Default is dark — only switch to light if user explicitly saved "light"
    const isDark = saved ? saved === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setDropdown(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const displayName = user?.user_metadata?.full_name?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "Account";
  const avatarLetter = displayName[0]?.toUpperCase() ?? "U";

  return (
    <>
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 border-b backdrop-blur-md"
        style={{ background: "var(--nav-bg)", borderColor: "var(--border)", height: 60 }}
      >
        {/* Logo */}
        <Link href="/" style={{
          fontWeight: 800, fontSize: 17, textDecoration: "none",
          color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8,
        }}>
          🛡️ <span>Fraud<span style={{ color: "var(--accent)" }}>Shield</span></span>
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} style={{
              padding:        "6px 14px",
              borderRadius:   "var(--radius-sm)",
              fontSize:       14,
              fontWeight:     pathname === l.href ? 600 : 500,
              color:          pathname === l.href ? "var(--accent)" : "var(--text-muted)",
              textDecoration: "none",
              background:     pathname === l.href ? "var(--accent-subtle)" : "transparent",
              transition:     "all 0.15s",
            }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              border: "1px solid var(--border)", background: "var(--bg-card)",
              cursor: "pointer", fontSize: 15, display: "flex",
              alignItems: "center", justifyContent: "center",
              transition: "border-color 0.15s",
            }}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? "☀️" : "🌙"}
          </button>

          {loading ? (
            <div style={{ width: 80, height: 32, background: "var(--subtle)", borderRadius: "var(--radius-sm)" }} />
          ) : user ? (
            /* Logged in — avatar + dropdown */
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setDropdown(d => !d)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 10px 5px 5px",
                  background: "var(--bg-card)", border: "1.5px solid var(--border)",
                  borderRadius: 24, cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                {/* Avatar */}
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "var(--accent)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: "hidden",
                }}>
                  {user.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} alt={avatarLetter}
                        style={{ width: 26, height: 26, objectFit: "cover" }} />
                    : avatarLetter}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                  {displayName}
                </span>
                {/* Settings gear */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"
                  style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>

              {/* Dropdown */}
              {dropdown && (
                <>
                  {/* Backdrop */}
                  <div style={{ position: "fixed", inset: 0, zIndex: 98 }}
                    onClick={() => setDropdown(false)} />

                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    minWidth: 200, zIndex: 99, overflow: "hidden",
                  }}>
                    {/* User info */}
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {user.user_metadata?.full_name ?? displayName}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {user.email}
                      </div>
                    </div>

                    {/* Menu items */}
                    {[
                      { href: "/dashboard", icon: "📊", label: "My analyses" },
                      { href: "/settings",  icon: "⚙️", label: "Settings"    },
                    ].map(item => (
                      <Link key={item.href} href={item.href}
                        onClick={() => setDropdown(false)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 16px", fontSize: 14,
                          color: "var(--text-primary)", textDecoration: "none",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span>{item.icon}</span>{item.label}
                      </Link>
                    ))}

                    <div style={{ borderTop: "1px solid var(--border)" }}>
                      <button onClick={handleLogout} style={{
                        width: "100%", textAlign: "left",
                        padding: "10px 16px", fontSize: 14,
                        color: "var(--danger)", background: "transparent",
                        border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 10,
                        transition: "background 0.1s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--danger-bg)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span>🚪</span> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Logged out */
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/login" style={{
                padding: "7px 16px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)", fontSize: 13, fontWeight: 500,
                color: "var(--text-primary)", textDecoration: "none",
                background: "transparent", transition: "all 0.15s",
              }}>
                Log in
              </Link>
              <Link href="/signup" style={{
                padding: "7px 16px", borderRadius: "var(--radius-sm)",
                background: "var(--accent)", color: "#fff",
                fontSize: 13, fontWeight: 600, textDecoration: "none",
                transition: "background 0.15s",
              }}>
                Sign up free
              </Link>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}