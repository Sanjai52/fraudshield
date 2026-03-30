"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import type { AnalysisResult } from "@/lib/types";

/* ---------------- MOCK DATA (TYPE SAFE) ---------------- */

const MOCK_RESULTS: Record<
  string,
  { input: string; result: AnalysisResult; analysed_at: string }
> = {
  a1: {
    input:
      "Your SBI account has been suspended. Verify at sbi-kyc.net/login now.",
    analysed_at: "2026-03-25T10:22:00Z",
    result: {
      verdict: "FRAUD",
      display_verdict: "HIGH_FRAUD",
      confidence: 0.97,
      fraud_probability: 0.97,
      signals: ["urgency_pressure", "credential_harvest"],
      explanation:
        "This message impersonates SBI using a spoofed sender ID and fake domain.",
      flags: [
        "Sender not verified",
        "Fake domain",
        "Urgency pressure",
        "Credential harvesting",
      ],
      action: "Do NOT click any links or share credentials.",
      sender_check: null,
      url_checks: [],
      model_version: "v1",
      language: "en",
    },
  },

  a2: {
    input: "http://hdfc-reward-points.com/claim",
    analysed_at: "2026-03-24T17:05:00Z",
    result: {
      verdict: "FRAUD",
      display_verdict: "HIGH_FRAUD",
      confidence: 0.93,
      fraud_probability: 0.93,
      signals: ["fake_domain"],
      explanation: "This domain is not affiliated with HDFC Bank.",
      flags: ["New domain", "Impersonation"],
      action: "Do NOT visit this link.",
      sender_check: null,
      url_checks: [],
      model_version: "v1",
      language: "en",
    },
  },

  a3: {
    input:
      "Congrats! You won ₹50,000 in KBC lottery. Call 9876543210 to claim.",
    analysed_at: "2026-03-23T09:14:00Z",
    result: {
      verdict: "FRAUD",
      display_verdict: "HIGH_FRAUD",
      confidence: 0.99,
      fraud_probability: 0.99,
      signals: ["lottery_scam"],
      explanation: "Classic lottery scam pattern.",
      flags: ["Unknown number", "Advance fee scam"],
      action: "Ignore and block.",
      sender_check: null,
      url_checks: [],
      model_version: "v1",
      language: "en",
    },
  },

  a4: {
    input:
      "Your OTP for UPI transaction is 748291. Valid for 10 mins. Do not share.",
    analysed_at: "2026-03-22T14:30:00Z",
    result: {
      verdict: "LEGITIMATE",
      display_verdict: "LEGITIMATE",
      confidence: 0.91,
      fraud_probability: 0.09,
      signals: [],
      explanation: "Standard OTP message.",
      flags: [],
      action: "Safe. Never share OTP.",
      sender_check: null,
      url_checks: [],
      model_version: "v1",
      language: "en",
    },
  },

  a5: {
    input: "Click here to track your Flipkart order: fkrt.it/XJd92k",
    analysed_at: "2026-03-21T08:00:00Z",
    result: {
      verdict: "FRAUD",
      display_verdict: "SUSPICIOUS",
      confidence: 0.62,
      fraud_probability: 0.62,
      signals: ["short_url"],
      explanation: "Shortened URL hides destination.",
      flags: ["Short URL risk"],
      action: "Expand link before clicking.",
      sender_check: null,
      url_checks: [],
      model_version: "v1",
      language: "en",
    },
  },
};

/* ---------------- UI CONFIG ---------------- */

const VERDICT_CONFIG = {
  HIGH_FRAUD: {
    label: "Dangerous — Likely Scam",
    icon: "✕",
    color: "#b91c1c",
    bar: "#ef4444",
  },
  SUSPICIOUS: {
    label: "Suspicious",
    icon: "⚠",
    color: "#b45309",
    bar: "#f59e0b",
  },
  LEGITIMATE: {
    label: "Safe",
    icon: "✓",
    color: "#16a34a",
    bar: "#22c55e",
  },
};

/* ---------------- HELPERS ---------------- */

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------- COMPONENT ---------------- */

export default function ResultPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const entry = MOCK_RESULTS[id];

  if (!entry) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <Nav />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p style={{ color: "var(--text-muted)" }}>Result not found.</p>
          <Link href="/dashboard">← Back</Link>
        </div>
      </div>
    );
  }

  const { result, input, analysed_at } = entry;
  const cfg = VERDICT_CONFIG[result.display_verdict];
  const pct = Math.round(result.confidence * 100);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Nav />

      <div className="max-w-4xl mx-auto px-8 py-10">
        <p className="text-2xl font-bold" style={{ color: cfg.color }}>
          {cfg.icon} {cfg.label}
        </p>

        <p style={{ color: "var(--text-muted)" }}>
          Analysed {formatDate(analysed_at)}
        </p>

        <div style={{ marginTop: 20 }}>
          <p>Confidence: {pct}%</p>
        </div>

        <div style={{ marginTop: 20 }}>
          <p>{input}</p>
        </div>

        <div style={{ marginTop: 20 }}>
          <p>{result.explanation}</p>
        </div>

        <div style={{ marginTop: 20 }}>
          <p>{result.action}</p>
        </div>
      </div>
    </div>
  );
}