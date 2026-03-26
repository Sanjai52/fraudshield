"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <header style={{
      position:       "sticky",
      top:            0,
      zIndex:         100,
      background:     "rgba(255,255,255,0.95)",
      backdropFilter: "blur(12px)",
      borderBottom:   "1px solid var(--border)",
    }}>
      <div style={{
        maxWidth:       1100,
        margin:         "0 auto",
        padding:        "0 24px",
        height:         64,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            24,
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display:        "flex",
          alignItems:     "center",
          gap:            10,
          textDecoration: "none",
          flexShrink:     0,
        }}>
          <span style={{ fontSize: 26 }}>🛡️</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            Fraud<span style={{ color: "var(--primary)" }}>Shield</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[
            { href: "/",        label: "Home" },
            { href: "/analyse", label: "Analyse" },
            { href: "/result",  label: "Results" },
            { href: "/about",   label: "About Us" },
            { href: "/contact", label: "Contact" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              padding:        "6px 14px",
              borderRadius:   "var(--radius-sm)",
              fontSize:       14,
              fontWeight:     500,
              color:          "var(--muted)",
              textDecoration: "none",
              transition:     "color 0.15s, background 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
              (e.currentTarget as HTMLElement).style.background = "var(--subtle)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--muted)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <Link href="/login" className="btn-outline" style={{ fontSize: 14, padding: "7px 18px" }}>
            Log in
          </Link>
          <Link href="/signup" className="btn-primary" style={{ fontSize: 14, padding: "8px 18px" }}>
            Sign up free
          </Link>
        </div>
      </div>
    </header>
  );
}