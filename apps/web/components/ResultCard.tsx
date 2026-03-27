import type { AnalysisResult } from "@/lib/types";

const VERDICT_CONFIG: Record<string, {
  label: string; icon: string;
  color: string; bg: string; border: string; bar: string;
}> = {
  SAFE: {
    label: "Looks Safe",
    icon:  "✅",
    color: "var(--success)",
    bg:    "var(--success-bg)",
    border:"var(--success-border)",
    bar:   "var(--success)",
  },
  SUSPICIOUS: {
    label: "Suspicious",
    icon:  "⚠️",
    color: "var(--warning)",
    bg:    "var(--warning-bg)",
    border:"var(--warning-border)",
    bar:   "var(--warning)",
  },
  DANGEROUS: {
    label: "Dangerous — Likely Scam",
    icon:  "🚨",
    color: "var(--danger)",
    bg:    "var(--danger-bg)",
    border:"var(--danger-border)",
    bar:   "var(--danger)",
  },
};

export default function ResultCard({ result }: { result: AnalysisResult }) {
  const cfg = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG["SUSPICIOUS"];
  const pct = Math.round(result.confidence * 100);
  const isSafe = result.verdict === "SAFE" || (result as any).display_verdict === "LEGITIMATE";

  return (
    <div style={{
      background:   "var(--bg-card)",
      border:       `1px solid var(--border)`,
      borderLeft:   `3px solid ${cfg.color}`,
      borderRadius: "var(--radius)",
      boxShadow:    "var(--shadow)",
      overflow:     "hidden",
    }}>

      {/* Verdict header */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          14,
        padding:      "18px 22px",
        background:   cfg.bg,
        borderBottom: `1px solid ${cfg.border}`,
      }}>
        <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 12, color: cfg.color, opacity: 0.7, marginTop: 2 }}>Confidence: {pct}%</div>
        </div>
        {/* Confidence pill */}
        <div style={{
          background:   cfg.color,
          color:        "white",
          fontWeight:   900,
          fontSize:     16,
          padding:      "4px 14px",
          borderRadius: "var(--radius-sm)",
          letterSpacing: "-0.01em",
          flexShrink:   0,
        }}>
          {pct}%
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ height: 3, background: "var(--border)" }}>
        <div style={{
          height:     "100%",
          width:      `${pct}%`,
          background: cfg.bar,
          transition: "width 0.7s ease",
        }} />
      </div>

      {/* Body */}
      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Explanation */}
        {result.explanation && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: "var(--muted)", marginBottom: 8,
            }}>
              {isSafe ? "Analysis summary" : "Why we flagged this"}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: "var(--foreground)" }}>
              {result.explanation}
            </p>
          </div>
        )}

        {/* Red flags */}
        {result.flags && result.flags.length > 0 && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: "var(--muted)", marginBottom: 8,
            }}>
              Red flags
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.flags.map((flag, i) => (
                <div key={i} style={{
                  display:      "flex",
                  alignItems:   "flex-start",
                  gap:          10,
                  fontSize:     13,
                  color:        "var(--foreground)",
                  padding:      "8px 12px",
                  background:   cfg.bg,
                  border:       `1px solid ${cfg.border}`,
                  borderLeft:   `3px solid ${cfg.color}`,
                  borderRadius: "var(--radius-sm)",
                }}>
                  <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>•</span>
                  {flag}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advice */}
        {result.advice && (
          <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: "var(--muted)", marginBottom: 8,
            }}>
              What to do
            </div>
            <div style={{
              display:    "flex",
              alignItems: "flex-start",
              gap:        8,
              fontSize:   14,
              lineHeight: 1.7,
              color:      "var(--foreground)",
            }}>
              <span style={{ flexShrink: 0 }}>👉</span>
              <span>{result.advice}</span>
            </div>
          </div>
        )}

        {/* Reported count */}
        {result.reported_count && result.reported_count > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: cfg.bar, flexShrink: 0,
              animation: "pulse 2s infinite",
            }} />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {result.reported_count.toLocaleString()} other users reported this message
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
          <button style={{
            flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600,
            background: "var(--bg)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", color: "var(--foreground)",
            cursor: "pointer", transition: "border-color 0.15s",
          }}>
            Share result
          </button>
          <button style={{
            flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600,
            background: "var(--bg)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", color: "var(--foreground)",
            cursor: "pointer", transition: "border-color 0.15s",
          }}>
            Report false positive
          </button>
        </div>

      </div>
    </div>
  );
}
