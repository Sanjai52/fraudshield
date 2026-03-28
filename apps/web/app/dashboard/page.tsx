"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [user,     setUser]     = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUser(data.user);
      supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data: rows }) => {
          setAnalyses(rows ?? []);
          setLoading(false);
        });
    });
  }, []);

  const verdictColor = (v: string) =>
    v === "FRAUD" ? "var(--danger)" : v === "LEGITIMATE" ? "var(--success)" : "var(--warning)";

  const verdictEmoji = (v: string) =>
    v === "FRAUD" ? "🚨" : v === "LEGITIMATE" ? "✅" : "⚠️";

  if (loading) return (
    <div style={{ maxWidth: 720, margin: "80px auto", textAlign: "center" }}>
      <p style={{ color: "var(--muted)" }}>Loading your analyses...</p>
    </div>
  );

  return (
    <main style={{ background: "var(--subtle)", minHeight: "calc(100vh - 64px)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
            My Analyses
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            {analyses.length} check{analyses.length !== 1 ? "s" : ""} saved to your account
          </p>
        </div>

        {analyses.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No analyses yet</h2>
            <p style={{ color: "var(--muted)", marginBottom: 24 }}>
              Analyse a suspicious message to see your history here.
            </p>
            <Link href="/analyse" className="btn-primary">Analyse a message →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {analyses.map((row) => (
              <div key={row.id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 22 }}>{verdictEmoji(row.verdict)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: verdictColor(row.verdict) }}>
                    {row.display_verdict?.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                    {row.input_type?.toUpperCase()} · {row.signals?.join(", ") || "no signals"} · {Math.round((row.confidence ?? 0) * 100)}% confidence
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "right", flexShrink: 0 }}>
                  {new Date(row.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit"
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}