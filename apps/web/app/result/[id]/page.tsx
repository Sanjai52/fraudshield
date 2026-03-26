"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import type { AnalysisResult } from "@/lib/types";

const MOCK_RESULTS: Record<string, { input: string; result: AnalysisResult; analysed_at: string }> = {
  a1: { input: "Your SBI account has been suspended. Verify at sbi-kyc.net/login now.", analysed_at: "2026-03-25T10:22:00Z", result: { verdict: "DANGEROUS", confidence: 0.97, explanation: "This message impersonates SBI using a spoofed sender ID. The link points to a fraudulent domain registered 6 days ago that hosts a fake SBI login page designed to steal credentials.", flags: ["Sender 'SBI-ALERT' is not registered to State Bank of India", "Domain sbi-kyc.net registered 6 days ago — not affiliated with SBI", "Urgency tactic: 'suspended account' pressure", "Credential harvesting page detected"], advice: "Do NOT click any link. Do NOT enter credentials. Call SBI customer care on 1800-11-2211 to verify your account status.", reported_count: 412, analysis_id: "a1" } },
  a2: { input: "http://hdfc-reward-points.com/claim", analysed_at: "2026-03-24T17:05:00Z", result: { verdict: "DANGEROUS", confidence: 0.93, explanation: "This domain was registered 3 days ago and is not affiliated with HDFC Bank.", flags: ["Domain hdfc-reward-points.com is 3 days old", "Not on HDFC official domain list", "Impersonates HDFC Bank rewards program", "Credential harvesting behaviour detected"], advice: "Do NOT visit this link. HDFC reward points are only accessed via hdfcbank.com.", reported_count: 89, analysis_id: "a2" } },
  a3: { input: "Congrats! You won ₹50,000 in KBC lottery. Call 9876543210 to claim.", analysed_at: "2026-03-23T09:14:00Z", result: { verdict: "DANGEROUS", confidence: 0.99, explanation: "Classic advance-fee lottery scam. KBC does not conduct lotteries or give prizes via SMS.", flags: ["Lottery scam pattern (99% match)", "KBC does not run SMS lotteries", "Unknown phone number not registered to any KBC entity", "Advance-fee fraud indicator"], advice: "Ignore and delete. Do NOT call the number. Block the sender.", reported_count: 1204, analysis_id: "a3" } },
  a4: { input: "Your OTP for UPI transaction is 748291. Valid for 10 mins. Do not share.", analysed_at: "2026-03-22T14:30:00Z", result: { verdict: "SAFE", confidence: 0.91, explanation: "Standard OTP delivery message from a verified bank gateway. No suspicious links or requests detected.", flags: [], advice: "This looks safe. Never share your OTP with anyone — not even bank employees.", analysis_id: "a4" } },
  a5: { input: "Click here to track your Flipkart order: fkrt.it/XJd92k", analysed_at: "2026-03-21T08:00:00Z", result: { verdict: "SUSPICIOUS", confidence: 0.62, explanation: "The message uses a shortened URL which hides the final destination.", flags: ["Shortened URL — final destination unverified", "Cannot confirm Flipkart origin"], advice: "Expand the link before clicking using checkshorturl.com.", analysis_id: "a5" } },
};

const VERDICT_CONFIG = {
  SAFE:      { label: "Safe",                   icon: "✓", color: "#16a34a", bar: "#22c55e" },
  SUSPICIOUS:{ label: "Suspicious",             icon: "⚠", color: "#b45309", bar: "#f59e0b" },
  DANGEROUS: { label: "Dangerous — Likely Scam",icon: "✕", color: "#b91c1c", bar: "#ef4444" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ResultPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const entry = MOCK_RESULTS[id];

  if (!entry) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <Nav />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Result not found.</p>
          <Link href="/dashboard" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const { result, input, analysed_at } = entry;
  const cfg = VERDICT_CONFIG[result.verdict];
  const pct = Math.round(result.confidence * 100);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Nav />

      <div className="max-w-4xl mx-auto px-8 py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm mb-8 transition hover:underline" style={{ color: "var(--text-muted)" }}>
          ← Back to dashboard
        </Link>

        {/* Verdict card */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <span className="text-4xl font-bold leading-none" style={{ color: cfg.color }}>{cfg.icon}</span>
            <div className="flex-1">
              <p className="text-2xl font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Analysed {formatDate(analysed_at)}</p>
            </div>
          </div>

          {/* Confidence */}
          <div className="mb-5">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              <span>Confidence</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cfg.bar }} />
            </div>
          </div>

          {/* Analysed content */}
          <div className="rounded-xl px-4 py-3 mb-5" style={{ background: "var(--bg)" }}>
            <p className="text-[10px] uppercase tracking-wider mb-1 font-semibold" style={{ color: "var(--text-muted)" }}>Analysed content</p>
            <p className="text-sm leading-relaxed break-all" style={{ color: "var(--text-secondary)" }}>{input}</p>
          </div>

          {/* Explanation */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>Why we flagged this</p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{result.explanation}</p>
          </div>

          {/* Flags */}
          {result.flags && result.flags.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>Red flags</p>
              <ul className="space-y-1.5">
                {result.flags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span className="mt-0.5 flex-shrink-0" style={{ color: cfg.color }}>•</span>{flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Advice */}
          <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>What to do</p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{result.advice}</p>
          </div>
        </div>

        {/* Campaign */}
        {result.reported_count && result.reported_count > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: cfg.bar }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {result.reported_count.toLocaleString()} other users reported this same pattern
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mb-8">
          <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex-1 py-2.5 rounded-xl text-sm transition" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            Copy link
          </button>
          <button className="flex-1 py-2.5 rounded-xl text-sm transition" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            Report false positive
          </button>
        </div>

        <div className="text-center">
          <Link href="/analyse" className="inline-block font-semibold px-7 py-3 rounded-xl text-sm transition" style={{ background: "var(--accent)", color: "#fff" }}>
            Analyse another message →
          </Link>
        </div>
      </div>
    </div>
  );
}
