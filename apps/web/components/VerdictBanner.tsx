interface Props {
  display_verdict: string;
  confidence:      number;
  action:          string;
}

const CONFIG: Record<string, { label: string; emoji: string; bg: string; color: string; border: string; badge: string }> = {
  HIGH_FRAUD:  { label: "HIGH RISK — This is a scam",        emoji: "🚨", bg: "var(--danger-bg)",  color: "var(--danger)",  border: "var(--danger-border)",  badge: "#dc2626" },
  SUSPICIOUS:  { label: "SUSPICIOUS — Treat with caution",   emoji: "⚠️", bg: "var(--warning-bg)", color: "var(--warning)", border: "var(--warning-border)", badge: "#b45309" },
  LEGITIMATE:  { label: "LOOKS SAFE — No major threats",     emoji: "✅", bg: "var(--success-bg)", color: "var(--success)", border: "var(--success-border)", badge: "#15803d" },
  HIGH_RISK_URL:   { label: "DANGEROUS URL — Do not visit",  emoji: "🚨", bg: "var(--danger-bg)",  color: "var(--danger)",  border: "var(--danger-border)",  badge: "#dc2626" },
  SUSPICIOUS_URL:  { label: "SUSPICIOUS URL — Use caution",  emoji: "⚠️", bg: "var(--warning-bg)", color: "var(--warning)", border: "var(--warning-border)", badge: "#b45309" },
  URL_LOOKS_SAFE:  { label: "URL APPEARS CLEAN",             emoji: "✅", bg: "var(--success-bg)", color: "var(--success)", border: "var(--success-border)", badge: "#15803d" },
};

export default function VerdictBanner({ display_verdict, confidence, action }: Props) {
  const cfg = CONFIG[display_verdict] ?? CONFIG["SUSPICIOUS"];
  const pct = Math.round(confidence * 100);

  return (
    <div style={{
      background:    cfg.bg,
      border:        `1.5px solid ${cfg.border}`,
      borderRadius:  "var(--radius)",
      padding:       "24px 28px",
      boxShadow:     "var(--shadow)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>{cfg.emoji}</span>
          <div>
            <div style={{ fontSize: "clamp(16px, 2.5vw, 20px)", fontWeight: 800, color: cfg.color, letterSpacing: "-0.01em" }}>
              {cfg.label}
            </div>
            <div style={{ fontSize: 13, color: cfg.color, opacity: 0.75, marginTop: 3 }}>
              Model confidence: {pct}%
            </div>
          </div>
        </div>

        {/* Confidence pill */}
        <div style={{
          background:    cfg.badge,
          color:         "white",
          fontWeight:    900,
          fontSize:      "clamp(18px, 3vw, 26px)",
          padding:       "8px 20px",
          borderRadius:  "var(--radius-sm)",
          letterSpacing: "-0.02em",
          whiteSpace:    "nowrap",
        }}>
          {pct}%
        </div>
      </div>

      {/* Action step */}
      {action && (
        <div style={{
          marginTop:   18,
          paddingTop:  18,
          borderTop:   `1px solid ${cfg.border}`,
          fontSize:    14,
          color:       cfg.color,
          fontWeight:  500,
          lineHeight:  1.6,
          display:     "flex",
          alignItems:  "flex-start",
          gap:         8,
        }}>
          <span style={{ flexShrink: 0 }}>👉</span>
          <span>{action}</span>
        </div>
      )}
    </div>
  );
}