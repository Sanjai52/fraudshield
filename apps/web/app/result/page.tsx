"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import VerdictBanner from "@/components/VerdictBanner";
import EvidencePanel from "@/components/EvidencePanel";
import FeedbackForm from "@/components/FeedbackForm";
import { storeAnalysis } from "@/lib/db";
import { createClient } from "@/lib/supabase";




// Verdict-specific colour tokens
const VERDICT_STYLE: Record<string, {
  border: string;
  bg: string;
  labelColor: string;
  icon: string;
  label: string;
  cardLabel: string;
}> = {
  HIGH_FRAUD: {
    border:     "var(--danger)",
    bg:         "var(--danger-bg)",
    labelColor: "var(--danger)",
    icon:       "🚨",
    label:      "HIGH FRAUD",
    cardLabel:  "Why this is flagged as a scam",
  },
  SUSPICIOUS: {
    border:     "var(--warning)",
    bg:         "var(--warning-bg)",
    labelColor: "var(--warning)",
    icon:       "⚠️",
    label:      "SUSPICIOUS",
    cardLabel:  "Why this looks suspicious",
  },
  LEGITIMATE: {
    border:     "var(--success)",
    bg:         "var(--success-bg)",
    labelColor: "var(--success)",
    icon:       "✅",
    label:      "LOOKS SAFE",
    cardLabel:  "Analysis summary",
  },
};

export default function ResultPage() {
  const [data, setData] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  useEffect(() => {
  const run = async () => {
    const stored = localStorage.getItem("fraud_result");

    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      const age = parsed.timestamp ? now - parsed.timestamp : 0;

      if (age < 60000 || !parsed.timestamp) {
        setData(parsed);
      }

      // 🔐 Supabase
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // 🧠 Store analysis
      const id = await storeAnalysis(
        parsed,
        parsed._tab ?? "text",
        user?.id ?? null
      );

      if (id) setAnalysisId(id);

      localStorage.removeItem("fraud_result");

    } catch (e) {
      console.error("Failed to parse fraud_result:", e);
      localStorage.removeItem("fraud_result");
    }
  };

  run();
}, []);

  if (!data) return (
    <div style={{ maxWidth: 560, margin: "100px auto", textAlign: "center", padding: "0 24px" }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>🤔</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>No result found</h2>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>Analyse a message first to see results here.</p>
      <Link href="/analyse" className="btn-primary">Analyse a message →</Link>
    </div>
  );

  const isUrl = data._tab === "url";
  const fp    = (data.fraud_probability as number) ?? 0;

  // Resolve display_verdict — trust what Analyser.tsx stored (already client-corrected)
  const displayVerdict: string =
    data.display_verdict ??
    (fp >= 0.80 ? "HIGH_FRAUD" : fp >= 0.50 ? "SUSPICIOUS" : "LEGITIMATE");

  const vstyle = VERDICT_STYLE[displayVerdict] ?? VERDICT_STYLE["SUSPICIOUS"];
  const finalExplanation: string = data.explanation || "Analysis complete.";

  return (
    <main style={{ background: "var(--subtle)", minHeight: "calc(100vh - 64px)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Back link */}
        <Link href="/analyse" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 14, color: "var(--muted)", textDecoration: "none", marginBottom: 28,
        }}>
          ← Analyse another message
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Verdict banner */}
          <VerdictBanner
            display_verdict={displayVerdict}
            confidence={data.confidence ?? fp}
            action={
              data.action ||
              (displayVerdict === "HIGH_FRAUD"
                ? "Do NOT click any links or share personal info. Report this to cybercrime.gov.in or call 1930."
                : displayVerdict === "SUSPICIOUS"
                ? "Proceed with caution. Verify the sender through official channels before responding."
                : "This message appears safe, but always stay vigilant.")
            }
          />

          {/* Original input */}
          {data._input && (
            <div className="card" style={{ padding: "18px 22px" }}>
              <div className="section-label">{isUrl ? "URL checked" : "Message analysed"}</div>
              <p style={{
                margin: "10px 0 0", fontSize: 14, lineHeight: 1.7,
                wordBreak: "break-all",
                fontFamily: isUrl ? "monospace" : "inherit",
                color: "var(--foreground)",
                background: "var(--subtle)",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}>
                {data._input}
              </p>
            </div>
          )}

          {/* Analysis explanation card */}
          {!isUrl && (
            <div style={{
              background:   "var(--bg-card)",
              borderRadius: "var(--radius)",
              border:       `1px solid var(--border)`,
              borderLeft:   `4px solid ${vstyle.border}`,
              boxShadow:    "var(--shadow)",
              overflow:     "hidden",
            }}>
              {/* Tinted header strip */}
              <div style={{
                display:      "flex",
                alignItems:   "center",
                gap:          12,
                padding:      "16px 22px",
                background:   vstyle.bg,
                borderBottom: `1px solid ${vstyle.border}`,
              }}>
                <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{vstyle.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize:      10,
                    fontWeight:    800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color:         vstyle.labelColor,
                    marginBottom:  2,
                  }}>
                    {vstyle.label}
                  </div>
                  <div style={{
                    fontSize:      11,
                    fontWeight:    600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color:         vstyle.labelColor,
                    opacity:       0.65,
                  }}>
                    {vstyle.cardLabel}
                  </div>
                </div>
              </div>

              {/* Body — always on --bg-card, never tinted */}
              <div style={{ padding: "20px 22px" }}>
                <p style={{
                  margin:     0,
                  fontSize:   14,
                  lineHeight: 1.8,
                  color:      "var(--text-primary)",
                }}>
                  {finalExplanation}
                </p>
              </div>
            </div>
          )}

          {/* URL evidence breakdown */}
          {isUrl ? (
            <div className="card" style={{ padding: "20px 24px" }}>
              <div className="section-label">URL evidence breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                {[
                  { label: "Domain age",    val: data.domain_age_days != null ? `${data.domain_age_days} days` : "Unknown",  flag: data.domain_age_days != null && data.domain_age_days < 30 },
                  { label: "Safe Browsing", val: data.safebrowsing_hit ? "⚠️ Flagged" : "✅ Clean",                          flag: data.safebrowsing_hit },
                  { label: "VirusTotal",    val: data.virustotal_score ?? "—",                                                flag: data.virustotal_malicious > 0 },
                  { label: "PhishTank",     val: data.phishtank_hit   ? "⚠️ In database" : "✅ Not listed",                  flag: data.phishtank_hit },
                ].map(item => (
                  <div key={item.label} style={{
                    padding: "14px 16px",
                    borderRadius: "var(--radius-sm)",
                    background: item.flag ? "var(--danger-bg)" : "var(--success-bg)",
                    border: `1px solid ${item.flag ? "var(--danger-border)" : "var(--success-border)"}`,
                  }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: item.flag ? "var(--danger)" : "var(--success)" }}>{item.val}</div>
                  </div>
                ))}
              </div>
              {data.explanation && (
                <p style={{ margin: "16px 0 0", fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>{data.explanation}</p>
              )}
            </div>

          ) : displayVerdict !== "LEGITIMATE" ? (
            <EvidencePanel
              signals={data.signals ?? []}
              sender_check={data.sender_check ?? null}
              url_checks={data.url_checks ?? []}
              explanation=""
            />
          ) : null}

          {/* Actions */}
          <div className="card" style={{ padding: "18px 22px", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/analyse" className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
              Analyse another message
            </Link>
            <button
              className="btn-outline"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Copy result link
            </button>
          </div>

          {/* Helpline reminder */}
          <div style={{
            padding: "14px 18px",
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            color: "var(--danger)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>🚨</span>
            <span>
              <strong>Already sent money?</strong> Call the National Cyber Crime helpline immediately: <strong>1930</strong>
            </span>
          </div>

          {/* Feedback */}
          {/* <FeedbackForm analysisId={analysisId} userId="" /> */}

        </div>
      </div>
    </main>
  );
}
