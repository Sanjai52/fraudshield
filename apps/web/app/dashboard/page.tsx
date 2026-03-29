"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUserAnalyses, getUserStats } from "@/lib/db";

const VERDICT_COLOR: Record<string, string> = {
  FRAUD:      "var(--danger)",
  LEGITIMATE: "var(--success)",
  ERROR:      "var(--muted)",
};
const VERDICT_BG: Record<string, string> = {
  FRAUD:      "var(--danger-bg)",
  LEGITIMATE: "var(--success-bg)",
  ERROR:      "var(--subtle)",
};
const VERDICT_EMOJI: Record<string, string> = {
  FRAUD:      "🚨",
  LEGITIMATE: "✅",
  ERROR:      "❓",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card dash-stat-card">
      <div className="dash-stat-value">{value}</div>
      <div className="dash-stat-label">{label}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [stats,    setStats]    = useState({ total: 0, fraud: 0, safe: 0, thisMonth: 0 });
  const [user,     setUser]     = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"ALL" | "FRAUD" | "LEGITIMATE">("ALL");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUser(data.user);
      const [rows, s] = await Promise.all([
        getUserAnalyses(data.user.id, 100),
        getUserStats(data.user.id),
      ]);
      setAnalyses(rows);
      setStats(s);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "ALL" ? analyses : analyses.filter(r => r.verdict === filter);

  if (loading) return (
    <div className="dash-loading">
      <div className="dash-spinner" />
      <p>Loading your dashboard…</p>
    </div>
  );

  return (
    <main className="dash-main">
      <div className="dash-container">

        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-subtitle">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
            </p>
          </div>
          <Link href="/analyse" className="btn-primary">
            + New analysis
          </Link>
        </div>

        {/* Stats */}
        <div className="dash-stats-grid">
          <StatCard label="Total checks"     value={stats.total}     sub="all time" />
          <StatCard label="Fraud detected"   value={stats.fraud}     sub={`${stats.total ? Math.round(stats.fraud/stats.total*100) : 0}% of checks`} />
          <StatCard label="Safe messages"    value={stats.safe}      sub="confirmed legitimate" />
          <StatCard label="This month"       value={stats.thisMonth} sub="analyses run" />
        </div>

        {/* Filter tabs */}
        <div className="dash-filter-row">
          {(["ALL", "FRAUD", "LEGITIMATE"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`dash-filter-btn ${filter === f ? "dash-filter-active" : ""}`}
            >
              {f === "ALL" ? "All" : f === "FRAUD" ? "🚨 Fraud" : "✅ Safe"}
              <span className="dash-filter-count">
                {f === "ALL" ? analyses.length : analyses.filter(r => r.verdict === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card dash-empty">
            <div className="dash-empty-icon">🔍</div>
            <h2>No analyses yet</h2>
            <p>Analyse a suspicious message to see your history here.</p>
            <Link href="/analyse" className="btn-primary">Analyse a message →</Link>
          </div>
        ) : (
          <div className="dash-list">
            {filtered.map(row => (
              <Link key={row.id} href={`/dashboard/${row.id}`} className="card dash-row">
                <div className="dash-row-emoji">
                  {VERDICT_EMOJI[row.verdict] ?? "❓"}
                </div>
                <div className="dash-row-main">
                  <div className="dash-row-verdict" style={{ color: VERDICT_COLOR[row.verdict] ?? "var(--muted)" }}>
                    {row.display_verdict?.replace(/_/g, " ") ?? row.verdict}
                  </div>
                  <div className="dash-row-meta">
                    <span className="dash-tag">{row.input_type?.toUpperCase()}</span>
                    <span className="dash-tag">{Math.round((row.confidence ?? 0) * 100)}% confidence</span>
                    {row.signals?.slice(0, 2).map((s: string) => (
                      <span key={s} className="dash-tag dash-tag-signal">{s.replace(/_/g, " ")}</span>
                    ))}
                    {row.signals?.length > 2 && (
                      <span className="dash-tag">+{row.signals.length - 2} more</span>
                    )}
                  </div>
                </div>
                <div className="dash-row-date">
                  {new Date(row.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
                <div className="dash-row-arrow">→</div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}