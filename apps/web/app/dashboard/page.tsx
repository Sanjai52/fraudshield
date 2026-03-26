"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import type { AnalysisResult } from "@/lib/types";

interface HistoryEntry {
  id: string;
  input: string;
  type: "text" | "url";
  result: AnalysisResult;
  analysed_at: string;
}

const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "a1",
    input: "Your SBI account has been suspended. Verify at sbi-kyc.net/login now.",
    type: "text",
    analysed_at: "2026-03-25T10:22:00Z",
    result: { verdict: "DANGEROUS", confidence: 0.97, explanation: "Fake SBI sender, phishing link, urgency tactics.", flags: ["Fake sender ID", "Phishing URL", "Urgency language"], advice: "Do NOT click. Call SBI on 1800-11-2211.", reported_count: 412, analysis_id: "a1" },
  },
  {
    id: "a2",
    input: "http://hdfc-reward-points.com/claim",
    type: "url",
    analysed_at: "2026-03-24T17:05:00Z",
    result: { verdict: "DANGEROUS", confidence: 0.93, explanation: "Domain registered 3 days ago. Not affiliated with HDFC.", flags: ["New domain", "Impersonation", "Credential harvesting"], advice: "Do NOT visit this link.", reported_count: 89, analysis_id: "a2" },
  },
  {
    id: "a3",
    input: "Congrats! You won ₹50,000 in KBC lottery. Call 9876543210 to claim.",
    type: "text",
    analysed_at: "2026-03-23T09:14:00Z",
    result: { verdict: "DANGEROUS", confidence: 0.99, explanation: "Classic lottery scam.", flags: ["Lottery scam", "Unsolicited prize", "Phone number trap"], advice: "Ignore and delete.", reported_count: 1204, analysis_id: "a3" },
  },
  {
    id: "a4",
    input: "Your OTP for UPI transaction is 748291. Valid for 10 mins. Do not share.",
    type: "text",
    analysed_at: "2026-03-22T14:30:00Z",
    result: { verdict: "SAFE", confidence: 0.91, explanation: "Standard OTP message from a known bank gateway.", flags: [], advice: "Looks safe. Never share your OTP with anyone.", analysis_id: "a4" },
  },
  {
    id: "a5",
    input: "Click here to track your Flipkart order: fkrt.it/XJd92k",
    type: "text",
    analysed_at: "2026-03-21T08:00:00Z",
    result: { verdict: "SUSPICIOUS", confidence: 0.62, explanation: "Short URL — destination could not be verified.", flags: ["Shortened URL", "Unverified destination"], advice: "Expand the link before clicking.", analysis_id: "a5" },
  },
];

const VERDICT_STYLE = {
  SAFE:      { dot: "#22c55e", badge: { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" } },
  SUSPICIOUS:{ dot: "#f59e0b", badge: { background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" } },
  DANGEROUS: { dot: "#ef4444", badge: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" } },
};

const VERDICT_STYLE_DARK = {
  SAFE:      { badge: { background: "#052e16", color: "#4ade80", border: "1px solid #166534" } },
  SUSPICIOUS:{ badge: { background: "#1c1400", color: "#fbbf24", border: "1px solid #78350f" } },
  DANGEROUS: { badge: { background: "#1a0000", color: "#f87171", border: "1px solid #991b1b" } },
};

function timeAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const [filter, setFilter] = useState<"all" | "DANGEROUS" | "SUSPICIOUS" | "SAFE">("all");

  const filtered = filter === "all" ? MOCK_HISTORY : MOCK_HISTORY.filter(e => e.result.verdict === filter);
  const stats = [
    { label: "Total checked", value: MOCK_HISTORY.length },
    { label: "Dangerous", value: MOCK_HISTORY.filter(e => e.result.verdict === "DANGEROUS").length },
    { label: "Suspicious", value: MOCK_HISTORY.filter(e => e.result.verdict === "SUSPICIOUS").length },
    { label: "Safe", value: MOCK_HISTORY.filter(e => e.result.verdict === "SAFE").length },
  ];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Nav active="dashboard" />

      <div className="max-w-4xl mx-auto px-8 py-10">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Your activity</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>Messages you've analysed recently.</p>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Community strip */}
        <div className="rounded-2xl px-5 py-4 mb-8 flex flex-wrap gap-6 items-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Community reports contributed</p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>3</p>
          </div>
          <div className="w-px h-8 hidden sm:block" style={{ background: "var(--border)" }} />
          <div>
            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Users warned (community)</p>
            <p className="text-xl font-bold" style={{ color: "var(--accent)" }}>1,705</p>
          </div>
          <p className="ml-auto text-xs hidden sm:block" style={{ color: "var(--text-muted)" }}>Based on anonymised data</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {(["all", "DANGEROUS", "SUSPICIOUS", "SAFE"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={filter === f
                ? { background: "var(--accent)", color: "#fff" }
                : { color: "var(--text-muted)" }
              }
            >
              {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.map(entry => {
            const vs = VERDICT_STYLE[entry.result.verdict];
            return (
              <Link
                key={entry.id}
                href={`/result/${entry.id}`}
                className="flex items-start gap-4 rounded-2xl px-5 py-4 transition-all group"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: vs.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{entry.input}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={vs.badge}>
                      {entry.result.verdict}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {Math.round(entry.result.confidence * 100)}% confidence
                    </span>
                    {entry.result.reported_count && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        · {entry.result.reported_count.toLocaleString()} reports
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>{timeAgo(entry.analysed_at)}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link href="/analyse" className="inline-block font-semibold px-7 py-3 rounded-xl text-sm transition" style={{ background: "var(--accent)", color: "#fff" }}>
            Analyse another message →
          </Link>
        </div>
      </div>
    </div>
  );
}
