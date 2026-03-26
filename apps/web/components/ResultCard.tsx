import type { AnalysisResult } from "@/lib/types";

const VERDICT_CONFIG = {
  SAFE: {
    label: "Safe",
    icon: "✓",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    bar: "#22c55e",
    darkBg: "#052e16",
    darkBorder: "#166534",
    darkColor: "#4ade80",
  },
  SUSPICIOUS: {
    label: "Suspicious",
    icon: "⚠",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    bar: "#f59e0b",
    darkBg: "#1c1400",
    darkBorder: "#78350f",
    darkColor: "#fbbf24",
  },
  DANGEROUS: {
    label: "Dangerous — Likely Scam",
    icon: "✕",
    color: "#b91c1c",
    bg: "#fef2f2",
    border: "#fecaca",
    bar: "#ef4444",
    darkBg: "#1a0000",
    darkBorder: "#991b1b",
    darkColor: "#f87171",
  },
};

export default function ResultCard({ result }: { result: AnalysisResult }) {
  const cfg = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG["SUSPICIOUS"];
  const pct = Math.round(result.confidence * 100);

  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{
        background: "var(--bg-card)",
        border: `1px solid var(--border)`,
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Verdict header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold" style={{ color: cfg.color }}>
          {cfg.icon}
        </span>
        <div className="flex-1">
          <p className="text-lg font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Confidence: {pct}%
          </p>
        </div>
        {/* Confidence bar */}
        <div className="w-24">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: cfg.bar }}
            />
          </div>
          <p className="text-[10px] mt-1 text-right" style={{ color: "var(--text-muted)" }}>{pct}%</p>
        </div>
      </div>

      {/* Explanation */}
      {result.explanation && (
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>
            Why we flagged this
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {result.explanation}
          </p>
        </div>
      )}

      {/* Red flags */}
      {result.flags && result.flags.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>
            Red flags
          </p>
          <ul className="space-y-1.5">
            {result.flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: cfg.color }}>•</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advice */}
      {result.advice && (
        <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>
            What to do
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {result.advice}
          </p>
        </div>
      )}

      {/* Campaign */}
      {result.reported_count && result.reported_count > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.bar }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {result.reported_count.toLocaleString()} other users reported this message
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          className="flex-1 py-2 rounded-xl text-sm transition"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          Share result
        </button>
        <button
          className="flex-1 py-2 rounded-xl text-sm transition"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          Report false positive
        </button>
      </div>
    </div>
  );
}
