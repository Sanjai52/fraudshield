"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

interface PublicStats {
  total_analyses:      number;
  fraud_detected:      number;
  legit_detected:      number;
  false_positive_rate: number;
  model_f1:            number;
  model_version:       string;
  correct_verdicts:    number;
  wrong_verdicts:      number;
  feedback_count:      number;
}

interface ModelVersion {
  version:             string;
  base_model:          string;
  accuracy:            number;
  f1_score:            number;
  false_positive_rate: number;
  training_size:       number;
  notes:               string;
  deployed_at:         string;
}

export default function TransparencyPage() {
  const [stats,   setStats]   = useState<PublicStats | null>(null);
  const [model,   setModel]   = useState<ModelVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // 1. Fetch live stats from Railway API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const apiRes = await fetch(`${apiUrl}/stats/public`).catch(() => null);
      const apiStats = apiRes?.ok ? await apiRes.json() : {};

      // 2. Fetch feedback accuracy from Supabase
      const { data: feedbackData } = await supabase
        .from("feedback")
        .select("user_says_correct")
        .limit(1000);

      const feedbackRows   = feedbackData ?? [];
      const feedbackCount  = feedbackRows.length;
      const correctCount   = feedbackRows.filter(f => f.user_says_correct === true).length;
      const wrongCount     = feedbackRows.filter(f => f.user_says_correct === false).length;

      // 3. Total analyses from Supabase (source of truth)
      const { count: totalCount } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true });

      const { count: fraudCount } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("verdict", "FRAUD");

      const { count: legitCount } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("verdict", "LEGITIMATE");

      // 4. Latest model version from Supabase
      const { data: modelData } = await supabase
        .from("model_versions")
        .select("*")
        .order("deployed_at", { ascending: false })
        .limit(1)
        .single();

      setModel(modelData ?? null);
      setStats({
        total_analyses:      totalCount     ?? apiStats.total_analyses  ?? 0,
        fraud_detected:      fraudCount     ?? apiStats.fraud_detected   ?? 0,
        legit_detected:      legitCount     ?? apiStats.legit_detected   ?? 0,
        false_positive_rate: modelData?.false_positive_rate ?? apiStats.false_positive_rate ?? 0.0063,
        model_f1:            modelData?.f1_score            ?? apiStats.model_f1            ?? 0.9859,
        model_version:       modelData?.version             ?? apiStats.model_version       ?? "v2",
        correct_verdicts:    correctCount,
        wrong_verdicts:      wrongCount,
        feedback_count:      feedbackCount,
      });
      setLoading(false);
    }

    load();
  }, []);

  const accuracy = stats && stats.feedback_count > 0
    ? Math.round((stats.correct_verdicts / stats.feedback_count) * 100)
    : null;

  return (
    <main>
      {/* Hero */}
      <section style={{
        background: "radial-gradient(circle at 50% 0%, #2563eb15, transparent 60%)",
        padding: "96px 24px 80px",
        textAlign: "center",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 900,
                       letterSpacing: "-0.02em", marginBottom: 16 }}>
            Transparency Dashboard
          </h1>
          <p style={{ fontSize: 17, color: "var(--muted)", lineHeight: 1.75,
                      maxWidth: 640, margin: "0 auto" }}>
            FraudShield publishes its own accuracy metrics openly — updated live from real user activity.
            No hidden scores. Full track record.
          </p>
        </div>
      </section>

      <section style={{ padding: "0 24px 64px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* ── Live Stats Strip ── */}
          <div style={{
            marginTop: -50, marginBottom: 40,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}>
            {[
              {
                label: "Total analyses",
                val:   loading ? "—" : (stats?.total_analyses ?? 0).toLocaleString("en-IN"),
                sub:   "all time",
                color: "var(--accent)",
              },
              {
                label: "Fraud detected",
                val:   loading ? "—" : (stats?.fraud_detected ?? 0).toLocaleString("en-IN"),
                sub:   `${stats && stats.total_analyses > 0 ? Math.round(stats.fraud_detected / stats.total_analyses * 100) : 0}% of checks`,
                color: "var(--danger)",
              },
              {
                label: "Safe messages",
                val:   loading ? "—" : (stats?.legit_detected ?? 0).toLocaleString("en-IN"),
                sub:   "confirmed legitimate",
                color: "var(--success)",
              },
              {
                label: "User feedback",
                val:   loading ? "—" : (stats?.feedback_count ?? 0).toLocaleString("en-IN"),
                sub:   "verdicts reviewed",
                color: "var(--accent)",
              },
              {
                label: "User accuracy rating",
                val:   loading ? "—" : accuracy !== null ? `${accuracy}%` : "No feedback yet",
                sub:   stats?.feedback_count ? `${stats.correct_verdicts} correct · ${stats.wrong_verdicts} disputed` : "submit feedback to improve",
                color: accuracy !== null && accuracy >= 90 ? "var(--success)" : "var(--warning)",
              },
              {
                label: "Model F1 score",
                val:   loading ? "—" : `${((stats?.model_f1 ?? 0) * 100).toFixed(1)}%`,
                sub:   `v${stats?.model_version ?? "2"} · MuRIL`,
                color: "var(--accent)",
              },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: "22px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", color: s.color }}>
                  {s.val}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginTop: 6 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* ── Main 2-col layout ── */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>

            {/* LEFT */}
            <div>
              {/* Model card */}
              <div className="card" style={{ padding: 28, marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>
                  Model — muril-fraud-{loading ? "…" : (stats?.model_version ?? "v2")}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    { label: "Base model",          val: model?.base_model      ?? "google/muril-base-cased" },
                    { label: "Training samples",     val: model?.training_size   ? model.training_size.toLocaleString("en-IN") : "110,000+" },
                    { label: "Validation F1",        val: model?.f1_score        ? `${(model.f1_score * 100).toFixed(2)}%` : loading ? "—" : `${((stats?.model_f1 ?? 0) * 100).toFixed(2)}%` },
                    { label: "False positive rate",  val: model?.false_positive_rate ? `${(model.false_positive_rate * 100).toFixed(2)}%` : loading ? "—" : `${((stats?.false_positive_rate ?? 0) * 100).toFixed(2)}%` },
                    { label: "Languages",            val: "English, Hindi, Hinglish" },
                    { label: "Model version",        val: loading ? "—" : stats?.model_version ?? "v2" },
                  ].map(item => (
                    <div key={item.label} style={{
                      padding: "12px 16px",
                      background: "var(--subtle)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                    }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600,
                                    textTransform: "uppercase", marginBottom: 4 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{item.val}</div>
                    </div>
                  ))}
                </div>
                {model?.notes && (
                  <p style={{ marginTop: 16, fontSize: 13, color: "var(--muted)",
                              lineHeight: 1.7, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    {model.notes}
                  </p>
                )}
              </div>

              {/* Feedback breakdown */}
              <div className="card" style={{ padding: 28 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                  User Feedback Breakdown
                </h3>
                {loading ? (
                  <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</div>
                ) : stats?.feedback_count === 0 ? (
                  <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                    No feedback submitted yet. After analysing a message, use the feedback form
                    on the result page to mark whether the verdict was correct.
                  </div>
                ) : (
                  <>
                    {/* Bar chart */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                      {[
                        { label: "Correct verdicts",   count: stats?.correct_verdicts ?? 0, color: "var(--success)", total: stats?.feedback_count ?? 1 },
                        { label: "Disputed verdicts",  count: stats?.wrong_verdicts   ?? 0, color: "var(--danger)",  total: stats?.feedback_count ?? 1 },
                      ].map(row => (
                        <div key={row.label}>
                          <div style={{ display: "flex", justifyContent: "space-between",
                                        fontSize: 13, marginBottom: 5 }}>
                            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{row.label}</span>
                            <span style={{ fontWeight: 700, color: row.color }}>
                              {row.count} ({Math.round(row.count / row.total * 100)}%)
                            </span>
                          </div>
                          <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 4,
                              background: row.color,
                              width: `${Math.round(row.count / row.total * 100)}%`,
                              transition: "width 1s ease",
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                      Based on {stats?.feedback_count.toLocaleString("en-IN")} user feedback submissions.
                      Disputed verdicts are reviewed and used to retrain the model.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Evidence layers */}
              <div className="card" style={{ padding: 28 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
                  Evidence Layers
                </h2>
                {[
                  { icon: "🤖", name: "MuRIL AI Model",       detail: "Fine-tuned transformer — 97%+ F1" },
                  { icon: "📵", name: "Sender ID Database",   detail: "12 banks + RBI + NPCI verified" },
                  { icon: "🔍", name: "Domain Heuristics",    detail: "Fake bank names, typosquatting" },
                  { icon: "🌐", name: "Google Safe Browsing", detail: "Phishing/malware detection" },
                  { icon: "🔬", name: "VirusTotal",           detail: "70+ engines scan" },
                  { icon: "🕷️", name: "Firecrawl",           detail: "Live page content scraping" },
                  { icon: "🔎", name: "URLScan.io",           detail: "Screenshot + DOM analysis" },
                ].map(item => (
                  <div key={item.name} style={{
                    display: "flex", gap: 12, padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Commit to accuracy */}
              <div className="card" style={{
                padding: 24,
                background: "var(--accent-subtle)",
                borderColor: "var(--accent-border)",
              }}>
                <div style={{ fontSize: 20, marginBottom: 10 }}>💡</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                  Help us improve
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>
                  After every analysis, use the feedback button on the result page
                  to tell us if the verdict was correct. Your input directly feeds
                  the next model training run.
                </p>
                <a href="/analyse" className="btn-primary"
                  style={{ fontSize: 13, padding: "8px 16px", display: "inline-flex" }}>
                  Try it now →
                </a>
              </div>

            </div>
          </div>
        </div>
      </section>
    </main>
  );
}