"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { analyseText, analyseUrl } from "@/lib/api";

type Tab = "text" | "url";

export default function Analyser() {
  const [tab, setTab]         = useState<Tab>("text");
  const [message, setMessage] = useState("");
  const [url, setUrl]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const router                = useRouter();

  const handleSubmit = async () => {
    setError("");
    if (tab === "text" && !message.trim()) { setError("Please paste a message to analyse."); return; }
    if (tab === "url"  && !url.trim())     { setError("Please enter a URL to check."); return; }

    setLoading(true);
    try {
      let data: any;
      if (tab === "text") {
        data = await analyseText(message.trim());
        data._input = message.trim();
        data._tab   = "text";
      } else {
        data = await analyseUrl(url.trim());
        data._input = url.trim();
        data._tab   = "url";
        // Normalise URL result to match text result shape for VerdictBanner
        data.display_verdict = data.verdict === "MALICIOUS" ? "HIGH_FRAUD"
                             : data.verdict === "SUSPICIOUS" ? "SUSPICIOUS"
                             : "LEGITIMATE";
        data.confidence = data.evidence_count > 0 ? 0.9 : 0.5;
      }
      localStorage.setItem("fraud_result", JSON.stringify(data));
      router.push("/result");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Make sure the API server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Tabs */}
      <div className="tabs">
        {([
          { id: "text", icon: "💬", label: "Text / SMS" },
          { id: "url",  icon: "🔗", label: "URL / Link" },
        ] as { id: Tab; icon: string; label: string }[]).map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => { setTab(t.id); setError(""); }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Input */}
      {tab === "text" ? (
        <div>
          <div className="section-label">Paste the suspicious message</div>
          <textarea
            rows={6}
            placeholder={'E.g. "SBI-ALERT: Your account is BLOCKED. Verify KYC at sbi-kyc.net immediately or account will be permanently closed. -SBI-KYC"'}
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
            Works with SMS, WhatsApp messages, email content, UPI alerts — in English or Hindi.
          </p>
        </div>
      ) : (
        <div>
          <div className="section-label">Enter the suspicious URL</div>
          <input
            type="text"
            placeholder="https://sbi-kyc.net/verify or paste any suspicious link"
            value={url}
            onChange={e => setUrl(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
            We check domain age, Google Safe Browsing, VirusTotal (70+ engines), and PhishTank — without you visiting the link.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding:      "12px 16px",
          background:   "var(--danger-bg)",
          border:       "1px solid var(--danger-border)",
          borderRadius: "var(--radius-sm)",
          fontSize:     14,
          color:        "var(--danger)",
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Submit */}
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading}
        style={{ padding: "14px 0", fontSize: 16, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? (
          <>
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
            Analysing…
          </>
        ) : (
          tab === "text" ? "Analyse message →" : "Check URL →"
        )}
      </button>

      {/* Trust badges */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {["🔒 No text stored", "⚡ Under 3 seconds", "🏦 12 banks verified"].map(b => (
          <span key={b} style={{ fontSize: 13, color: "var(--muted)" }}>{b}</span>
        ))}
      </div>
    </div>
  );
}