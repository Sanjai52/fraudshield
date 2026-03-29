"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAnalysis } from "@/lib/db";
import { createClient } from "@/lib/supabase";
import FeedbackForm from "@/components/FeedbackForm";

const VERDICT_COLOR: Record<string, string> = {
  FRAUD:      "var(--danger)",
  LEGITIMATE: "var(--success)",
  ERROR:      "var(--muted)",
};

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [row,     setRow]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId,  setUserId]  = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUserId(data.user.id);
      const analysis = await getAnalysis(id);
      if (!analysis || analysis.user_id !== data.user.id) {
        router.push("/dashboard");
        return;
      }
      setRow(analysis);
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="dash-loading">
      <div className="dash-spinner" />
    </div>
  );

  if (!row) return null;

  const verdictColor = VERDICT_COLOR[row.verdict] ?? "var(--muted)";

  return (
    <main className="dash-main">
      <div className="dash-container" style={{ maxWidth: 680 }}>

        {/* Back */}
        <Link href="/dashboard" className="detail-back">← Back to dashboard</Link>

        {/* Verdict header */}
        <div className="card detail-verdict-card" style={{ borderLeftColor: verdictColor }}>
          <div className="detail-verdict-top">
            <span className="detail-verdict-emoji">
              {row.verdict === "FRAUD" ? "🚨" : row.verdict === "LEGITIMATE" ? "✅" : "❓"}
            </span>
            <div>
              <div className="detail-verdict-label" style={{ color: verdictColor }}>
                {row.display_verdict?.replace(/_/g, " ") ?? row.verdict}
              </div>
              <div className="detail-verdict-meta">
                {row.input_type?.toUpperCase()} · {Math.round((row.confidence ?? 0) * 100)}% confidence ·{" "}
                {new Date(row.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </div>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="detail-conf-track">
            <div className="detail-conf-bar" style={{
              width: `${Math.round((row.confidence ?? 0) * 100)}%`,
              background: verdictColor,
            }} />
          </div>
        </div>

        {/* Explanation */}
        {row.explanation && (
          <div className="card detail-section">
            <div className="section-label">Analysis summary</div>
            <p className="detail-explanation">{row.explanation}</p>
          </div>
        )}

        {/* Signals */}
        {row.signals?.length > 0 && (
          <div className="card detail-section">
            <div className="section-label">Fraud signals ({row.signals.length})</div>
            <div className="detail-signals">
              {row.signals.map((s: string) => (
                <div key={s} className="detail-signal-chip">
                  <span style={{ color: verdictColor }}>●</span>
                  {s.replace(/_/g, " ")}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sender */}
        {row.sender_id && (
          <div className="card detail-section">
            <div className="section-label">Sender ID</div>
            <div className="detail-sender-row">
              <code className="detail-sender-code">{row.sender_id}</code>
              <span className="detail-sender-status" style={{
                color: row.sender_status === "verified" ? "var(--success)"
                     : row.sender_status === "known_fake" ? "var(--danger)"
                     : "var(--warning)",
              }}>
                {row.sender_status === "verified"   ? "✅ Verified"
                 : row.sender_status === "known_fake" ? "❌ Known fake"
                 : "⚠️ Unrecognised"}
              </span>
            </div>
          </div>
        )}

        {/* URL verdict */}
        {row.url_verdict && (
          <div className="card detail-section">
            <div className="section-label">URL verdict</div>
            <span style={{
              fontWeight: 700,
              color: row.url_verdict === "MALICIOUS"  ? "var(--danger)"
                   : row.url_verdict === "SUSPICIOUS" ? "var(--warning)"
                   : "var(--success)",
            }}>
              {row.url_verdict}
            </span>
          </div>
        )}

        {/* Action */}
        {row.action && (
          <div className="card detail-section">
            <div className="section-label">Recommended action</div>
            <p className="detail-action">👉 {row.action}</p>
          </div>
        )}

        {/* Meta */}
        <div className="card detail-section detail-meta-grid">
          <div><span className="section-label">Model version</span><br /><code>{row.model_version}</code></div>
          <div><span className="section-label">Language</span><br /><code>{row.language}</code></div>
          <div><span className="section-label">Input type</span><br /><code>{row.input_type}</code></div>
          <div><span className="section-label">Analysis ID</span><br /><code style={{ fontSize: 11 }}>{row.id}</code></div>
        </div>

        {/* Feedback */}
        <FeedbackForm analysisId={row.id} userId={userId} />

      </div>
    </main>
  );
}