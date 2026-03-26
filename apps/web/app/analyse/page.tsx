"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { analyseText, analyseUrl } from "@/lib/api";
import type { AnalysisResult } from "@/lib/types";
import ResultCard from "@/components/ResultCard";
import Spinner from "@/components/Spinner";

type Tab = "text" | "url" | "image" | "voice";

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: "text", label: "Message / SMS", icon: "💬" },
  { key: "url", label: "URL", icon: "🔗" },
  { key: "image", label: "Screenshot", icon: "🖼️" },
  { key: "voice", label: "Voice Note", icon: "🎤" },
];

export default function AnalysePage() {
  const [tab, setTab] = useState<Tab>("text");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = tab === "url" ? await analyseUrl(input) : await analyseText(input);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Nav active="analyse" />

      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Is this message a scam?
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Paste suspicious content below. We'll analyse it in seconds.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setInput(""); setResult(null); setError(null); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={tab === t.key
                ? { background: "var(--accent)", color: "#fff" }
                : { color: "var(--text-muted)" }
              }
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Input card */}
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
          {tab === "text" && (
            <textarea
              className="w-full bg-transparent text-sm resize-none outline-none min-h-[140px] leading-relaxed"
              style={{ color: "var(--text-primary)" }}
              placeholder="Paste the suspicious SMS or WhatsApp message here…"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
          )}
          {tab === "url" && (
            <input
              type="url"
              className="w-full bg-transparent text-sm outline-none py-2"
              style={{ color: "var(--text-primary)" }}
              placeholder="https://suspicious-link.com/login"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
          )}
          {(tab === "image" || tab === "voice") && (
            <div className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                {tab === "image" ? "Upload screenshot (PNG / JPG)" : "Upload voice note (MP3 / WAV / OGG)"}
              </p>
              <button className="px-4 py-2 rounded-lg text-sm transition" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                Choose file
              </button>
              <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>Coming soon in Phase 2</p>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={handleAnalyse}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 font-semibold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {loading && <Spinner />}
              {loading ? "Analysing…" : "Analyse →"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6">
            <ResultCard result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
