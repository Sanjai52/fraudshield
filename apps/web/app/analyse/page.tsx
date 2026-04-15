"use client";

import { useState, useRef } from "react";
import { analyseText, analyseUrl, analyseImage, analyseVoice } from "@/lib/api";
import { storeAnalysis } from "@/lib/db";
import { createClient } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────
type Tab = "text" | "url" | "screenshot" | "voice";

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "text",       icon: "💬", label: "Message / SMS" },
  { key: "url",        icon: "🔗", label: "URL"           },
  { key: "screenshot", icon: "📸", label: "Screenshot"    },
  { key: "voice",      icon: "🎙️", label: "Voice Note"   },
];

// ── Verdict styles ────────────────────────────────────────────
function getVerdictStyle(v: string) {
  if (v === "HIGH_FRAUD") return {
    icon: "🚨", label: "Dangerous — Likely Scam",
    color: "var(--danger)", bg: "var(--danger-bg)",
    border: "var(--danger-border)", bar: "var(--danger)",
  };
  if (v === "SUSPICIOUS") return {
    icon: "⚠️", label: "Suspicious — Treat with caution",
    color: "var(--warning)", bg: "var(--warning-bg)",
    border: "var(--warning-border)", bar: "var(--warning)",
  };
  return {
    icon: "✅", label: "Looks Safe",
    color: "var(--success)", bg: "var(--success-bg)",
    border: "var(--success-border)", bar: "var(--success)",
  };
}

// ── Normalise backend response ────────────────────────────────
function normalise(raw: any, tab: Tab, input: string): any {
  const data = { ...raw, _input: input, _tab: tab };

  // ───────────────── URL FLOW ─────────────────
  if (tab === "url") {
    let v = raw.verdict ?? "UNKNOWN";

    // 🔥 SIGNAL EXTRACTION
    const hasCriticalSignals =
      raw.firecrawl_has_cred_form === true ||
      (raw.virustotal_malicious ?? 0) > 0 ||
      raw.safebrowsing_hit === true;

    const hasSuspiciousSignals =
      (raw.heuristic_flags?.length ?? 0) > 0 ||
      (raw.firecrawl_fraud_signals?.length ?? 0) > 0;

    const isShortenedDomain =
      raw.domain &&
      raw.domain.length < 15 &&
      !raw.domain.includes(".gov") &&
      !raw.domain.includes(".bank");

    const isBankImpersonation =
      raw.heuristic_flags?.some((f: string) =>
        f.includes("bank_impersonation")
      );

    // 🔥 BALANCED VERDICT LOGIC
    if (hasCriticalSignals) {
      v = "SUSPICIOUS"; // ⚠️ not auto fraud
    } else if (hasSuspiciousSignals) {
      v = "SUSPICIOUS";
    }

    // 🔥 DISPLAY VERDICT
    data.display_verdict =
      v === "MALICIOUS"  ? "HIGH_FRAUD"  :
      v === "SUSPICIOUS" ? "SUSPICIOUS"  :
                           "LEGITIMATE";

    // 🔥 ESCALATION RULES
    if (
      isBankImpersonation ||
      (raw.firecrawl_has_cred_form && isShortenedDomain)
    ) {
      data.display_verdict = "HIGH_FRAUD";
    }

    // 🔥 CONFIDENCE (use backend)
    data.confidence = raw.confidence ?? 0.5;

    const riskScore = raw.risk_score ?? 0;
    data.fraud_probability = riskScore;

    // ── SIGNALS ─────────────────
    const signals: string[] = [];

    if (raw.signals?.length) {
      signals.push(...raw.signals);
    }

    if (raw.heuristic_flags?.length) {
      const flagLabels: Record<string, string> = {
        suspicious_tld:       "Suspicious domain extension",
        fake_pattern:         "Fake banking pattern in domain",
        bank_impersonation:   "Bank name impersonation",
        multiple_hyphens:     "Obfuscated domain structure",
        ip_address_domain:    "Raw IP address used",
        long_domain:          "Unusually long domain",
        credential_path:      "Credential-harvesting URL",
        excessive_subdomains: "Too many subdomains",
      };

      for (const flag of raw.heuristic_flags) {
        const key = flag.split(":")[0];
        const label = flagLabels[key] ?? flag.replace(/_/g, " ");
        if (!signals.includes(label)) signals.push(label);
      }
    }

    data.signals = signals;
    data.sender_check = null;

    // ── EVIDENCE ─────────────────
    data.url_checks = [{
      url: raw.url,
      domain: raw.domain,
      verdict: v,
      risk_score: riskScore,
      reasons: raw.reasons ?? [],

      domain_age_days: raw.domain_age_days ?? null,
      registrar: raw.registrar ?? null,
      domain_country: raw.domain_country ?? null,

      safebrowsing_hit: raw.safebrowsing_hit ?? false,
      safebrowsing_type: raw.safebrowsing_type ?? null,

      virustotal_score: raw.virustotal_score ?? "unknown",
      virustotal_malicious: raw.virustotal_malicious ?? 0,

      urlscan_malicious: raw.urlscan_malicious ?? false,
      urlscan_tags: raw.urlscan_tags ?? [],
      urlscan_country: raw.urlscan_country ?? null,
      urlscan_report_url: raw.urlscan_report_url ?? null,
      urlscan_screenshot_url: raw.urlscan_screenshot_url ?? null,

      firecrawl_scraped: raw.firecrawl_scraped ?? false,
      firecrawl_fraud_signals: raw.firecrawl_fraud_signals ?? [],
      firecrawl_has_cred_form: raw.firecrawl_has_cred_form ?? false,
      firecrawl_page_title: raw.firecrawl_page_title ?? null,

      heuristic_flags: raw.heuristic_flags ?? [],
      phishtank_hit: raw.phishtank_hit ?? false,
    }];

    data.model_version = "url-v3";
    data.language = "en";

    return data;
  }

  // ───────── TEXT / IMAGE / VOICE ─────────

  const fp = (data.fraud_probability as number) ?? 0;
  const signals = (data.signals as string[]) ?? [];

  const STRONG = new Set([
    "urgency_pressure",
    "credential_harvest",
    "threat_language",
    "fake_domain_hint",
    "fake_sender_id"
  ]);

  const hits = signals.filter(s => STRONG.has(s)).length;

  if (!data.display_verdict || data.display_verdict === "LEGITIMATE") {
    if (hits >= 3) {
      data.display_verdict = "HIGH_FRAUD";
    } else if (hits >= 2) {
      data.display_verdict = "SUSPICIOUS";
    } else if (hits >= 1 && fp >= 0.35) {
      data.display_verdict = "SUSPICIOUS";
    } else if (!data.display_verdict) {
      data.display_verdict =
        fp >= 0.80 ? "HIGH_FRAUD" :
        fp >= 0.50 ? "SUSPICIOUS" :
                     "LEGITIMATE";
    }
  }

  return data;
}

// ── Main component ────────────────────────────────────────────
export default function AnalysePage() {
  const [tab,       setTab]       = useState<Tab>("text");
  const [text,      setText]      = useState("");
  const [url,       setUrl]       = useState("");
  const [imgFile,   setImgFile]   = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [result,    setResult]    = useState<any>(null);

  const imgRef   = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  function switchTab(t: Tab) {
    setTab(t); setError(""); setResult(null);
    setText(""); setUrl(""); setImgFile(null); setAudioFile(null);
  }

  async function handleAnalyse() {
    setError(""); setResult(null);
    if (tab === "text"       && !text.trim())  { setError("Paste a message to analyse."); return; }
    if (tab === "url"        && !url.trim())    { setError("Enter a URL to check."); return; }
    if (tab === "screenshot" && !imgFile)       { setError("Select a screenshot first."); return; }
    if (tab === "voice"      && !audioFile)     { setError("Select a voice file first."); return; }

    setLoading(true);
    try {
      let raw: any;
      if      (tab === "text")       raw = await analyseText(text.trim());
      else if (tab === "url")        raw = await analyseUrl(url.trim());
      else if (tab === "screenshot") raw = await analyseImage(imgFile!);
      else                           raw = await analyseVoice(audioFile!);

      const input =
        tab === "text"       ? text.trim()    :
        tab === "url"        ? url.trim()      :
        tab === "screenshot" ? imgFile!.name   :
                               audioFile!.name;

      const normalised = normalise(raw, tab, input);
      setResult(normalised);

      // Store to Supabase in background
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        await storeAnalysis(normalised, tab, user?.id ?? null);
      } catch (dbErr) {
        console.error("DB save failed (non-critical):", dbErr);
      }
    } catch (err: any) {
      setError(
        err.message?.includes("fetch") || err.message?.includes("Failed")
          ? "Cannot reach the API. Make sure the server is running."
          : (err.message ?? "Something went wrong. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  const vkey   = result?.display_verdict ?? null;
  const vstyle = vkey ? getVerdictStyle(vkey) : null;
  const pct    = result ? Math.round((result.confidence ?? 0) * 100) : 0;

  const dropZone = (active: boolean): React.CSSProperties => ({
    marginTop: 8, border: `2px dashed ${active ? "var(--accent)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)", padding: "28px 20px", textAlign: "center",
    cursor: "pointer", background: active ? "var(--accent-subtle)" : "var(--bg-card)",
    transition: "all 0.15s",
  });

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "clamp(22px,4vw,30px)", fontWeight: 800,
                       letterSpacing: "-0.02em", marginBottom: 6, color: "var(--text-primary)" }}>
            Is this message a scam?
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)" }}>
            Paste suspicious content below — full AI + evidence analysis in seconds.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, padding: 4,
                      borderRadius: 10, width: "fit-content",
                      background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => switchTab(t.key)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: "none", cursor: "pointer", transition: "all 0.15s",
              background: tab === t.key ? "var(--accent)"    : "transparent",
              color:      tab === t.key ? "#fff"             : "var(--text-muted)",
            }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Input card */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)",
                      borderRadius: 16, padding: 20, boxShadow: "var(--shadow-card)", marginBottom: 16 }}>

          {tab === "text" && (
            <textarea rows={6} placeholder="Paste the suspicious SMS or WhatsApp message here…"
              value={text} onChange={e => setText(e.target.value)}
              style={{ border: "none", outline: "none", resize: "none", width: "100%",
                       background: "transparent", fontSize: 14, color: "var(--text-primary)",
                       lineHeight: 1.7, fontFamily: "inherit" }} />
          )}

          {tab === "url" && (
            <input type="text" placeholder="https://suspicious-link.com/login"
              value={url} onChange={e => setUrl(e.target.value)}
              style={{ border: "none", outline: "none", width: "100%",
                       background: "transparent", fontSize: 14,
                       color: "var(--text-primary)", fontFamily: "inherit", padding: "6px 0" }} />
          )}

          {tab === "screenshot" && (
            <>
              <div style={dropZone(!!imgFile)} onClick={() => imgRef.current?.click()}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
                {imgFile
                  ? <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>{imgFile.name}</p>
                  : <><p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                      Click to upload screenshot</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>PNG · JPG · WEBP · max 10 MB</p></>}
              </div>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { setImgFile(e.target.files?.[0] ?? null); setError(""); }} />
            </>
          )}

          {tab === "voice" && (
            <>
              <div style={dropZone(!!audioFile)} onClick={() => audioRef.current?.click()}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎙️</div>
                {audioFile
                  ? <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>{audioFile.name}</p>
                  : <><p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                      Click to upload voice note</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>MP3 · WAV · OGG · M4A · max 25 MB</p></>}
              </div>
              <input ref={audioRef} type="file" accept="audio/*" style={{ display: "none" }}
                onChange={e => { setAudioFile(e.target.files?.[0] ?? null); setError(""); }} />
            </>
          )}

          {/* Submit row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {["🔒 No text stored", "⚡ Under 3s", "🏦 12 banks"].map(b => (
                <span key={b} style={{ fontSize: 12, color: "var(--text-muted)" }}>{b}</span>
              ))}
            </div>
            <button onClick={handleAnalyse} disabled={loading} style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px",
              borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 600,
              fontSize: 14, border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, transition: "opacity 0.15s", flexShrink: 0,
            }}>
              {loading && (
                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                               borderTopColor: "#fff", borderRadius: "50%", display: "inline-block",
                               animation: "fs-spin 0.7s linear infinite" }} />
              )}
              {loading ? "Analysing…" :
                tab === "text"       ? "Analyse message →" :
                tab === "url"        ? "Check URL →"        :
                tab === "screenshot" ? "Analyse screenshot →" : "Analyse voice →"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", marginBottom: 16, background: "var(--danger-bg)",
                        border: "1px solid var(--danger-border)", borderRadius: 10,
                        fontSize: 14, color: "var(--danger)" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Result — delegates to URLResult for URL tab */}
        {result && vstyle && (
          tab === "url"
            ? <URLResult data={result} vstyle={vstyle} pct={pct} vkey={vkey} onReset={() => { setResult(null); setUrl(""); }} />
            : <TextResult data={result} vstyle={vstyle} pct={pct} vkey={vkey} onReset={() => { setResult(null); setText(""); }} />
        )}
      </div>
      <style>{`@keyframes fs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Text / image / voice result ───────────────────────────────
function TextResult({ data, vstyle, pct, vkey, onReset }: any) {
  return (
    <div style={{ borderRadius: 16, padding: 24, background: vstyle.bg,
                  border: `1.5px solid ${vstyle.border}`, boxShadow: "var(--shadow-card)" }}>
      <VerdictHeader vstyle={vstyle} pct={pct} />
      <ConfidenceBar pct={pct} bar={vstyle.bar} />

      {data.explanation && (
        <Section label={vkey === "LEGITIMATE" ? "Analysis summary" : "Why we flagged this"}>
          <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-primary)", margin: 0 }}>
            {data.explanation}
          </p>
        </Section>
      )}

      {vkey !== "LEGITIMATE" && data.signals?.length > 0 && (
        <Section label={`Red flags (${data.signals.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.signals.map((s: string, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10,
                                    padding: "10px 14px", borderRadius: 8,
                                    background: "var(--bg-card)", border: `1px solid ${vstyle.border}` }}>
                <span style={{ color: vstyle.color, marginTop: 1, flexShrink: 0 }}>●</span>
                <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {s.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.sender_check && <SenderCheckCard sender={data.sender_check} vstyle={vstyle} />}
      <ActionSection action={data.action} vkey={vkey} />
      <ResultActions vkey={vkey} onReset={onReset} />
    </div>
  );
}

// ── URL result — full evidence breakdown ──────────────────────
function URLResult({ data, vstyle, pct, vkey, onReset }: any) {
  const u = data.url_checks?.[0] ?? {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Verdict header card */}
      <div style={{ borderRadius: 16, padding: 24, background: vstyle.bg,
                    border: `1.5px solid ${vstyle.border}`, boxShadow: "var(--shadow-card)" }}>
        <VerdictHeader vstyle={vstyle} pct={pct} />
        <ConfidenceBar pct={pct} bar={vstyle.bar} />

        {/* URL being checked */}
        {data._input && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--bg-card)",
                        borderRadius: 8, border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
              URL checked
            </p>
            <code style={{ fontSize: 13, wordBreak: "break-all", color: "var(--text-primary)" }}>
              {data._input}
            </code>
          </div>
        )}

        {/* Main explanation */}
        {data.explanation && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
              {vkey === "LEGITIMATE" ? "Why this looks safe" : "Why this URL is dangerous"}
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-primary)", margin: 0 }}>
              {data.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Evidence cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* 1. Domain heuristics */}
        <EvidenceCard
          icon="🔍"
          title="Domain Analysis"
          status={u.heuristic_flags?.length > 0 ? "danger" : "clean"}
          statusLabel={u.heuristic_flags?.length > 0 ? `${u.heuristic_flags.length} flag(s) found` : "No suspicious patterns"}
        >
          {u.heuristic_flags?.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {u.heuristic_flags.slice(0, 4).map((f: string, i: number) => (
                <li key={i} style={{ fontSize: 12, color: "var(--text-primary)", marginBottom: 3 }}>
                  {f.replace(/_/g, " ").replace(/:/g, ": ")}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Domain structure appears normal
            </p>
          )}
        </EvidenceCard>

        {/* 2. Domain age */}
        <EvidenceCard
          icon="📅"
          title="Domain Age"
          status={u.domain_age_days != null && u.domain_age_days < 90 ? "danger" : "clean"}
          statusLabel={
            u.domain_age_days == null ? "Unknown"
            : u.domain_age_days < 7   ? `${u.domain_age_days} day(s) old — very new!`
            : u.domain_age_days < 30  ? `${u.domain_age_days} days old — recently created`
            : u.domain_age_days < 90  ? `${u.domain_age_days} days old — relatively new`
            : `${Math.floor(u.domain_age_days / 365)} year(s) old`
          }
        >
          {u.registrar && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Registrar: {u.registrar}
            </p>
          )}
          {u.domain_country && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Country: {u.domain_country}
            </p>
          )}
        </EvidenceCard>

        {/* 3. Google Safe Browsing */}
        <EvidenceCard
          icon="🛡️"
          title="Google Safe Browsing"
          status={u.safebrowsing_hit ? "danger" : "clean"}
          statusLabel={u.safebrowsing_hit
            ? `Flagged: ${u.safebrowsing_type ?? "threat detected"}`
            : "Not in threat database"}
        >
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            {u.safebrowsing_hit
              ? "Google has confirmed this URL is dangerous. Updated every 30 minutes across billions of URLs."
              : "Google's database of billions of URLs shows no threats for this domain."}
          </p>
        </EvidenceCard>

        {/* 4. VirusTotal */}
        <EvidenceCard
          icon="🔬"
          title="VirusTotal"
          status={(u.virustotal_malicious ?? 0) > 0 ? "danger" : "clean"}
          statusLabel={
            u.virustotal_score === "scan_pending" ? "Scan submitted"
            : u.virustotal_score === "unknown"     ? "Not yet scanned"
            : u.virustotal_score ?? "—"
          }
        >
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            {(u.virustotal_malicious ?? 0) > 0
              ? `${u.virustotal_malicious} independent security engines flagged this URL as malicious.`
              : "70+ security engines checked this URL — no threats detected."}
          </p>
        </EvidenceCard>

        {/* 5. URLScan.io */}
        <EvidenceCard
          icon="📡"
          title="URLScan.io"
          status={u.urlscan_malicious ? "danger" : "clean"}
          statusLabel={u.urlscan_malicious ? "Flagged as malicious" : "No threats detected"}
        >
          {u.urlscan_tags?.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 4px" }}>
              Tags: {u.urlscan_tags.slice(0, 3).join(", ")}
            </p>
          )}
          {u.urlscan_country && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Server country: {u.urlscan_country}
            </p>
          )}
          {u.urlscan_report_url && (
            <a href={u.urlscan_report_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: "var(--accent)", display: "block", marginTop: 4 }}>
              View full scan report →
            </a>
          )}
        </EvidenceCard>

        {/* 6. Firecrawl — live page content */}
        <EvidenceCard
          icon="🕷️"
          title="Live Page Analysis"
          status={
            u.firecrawl_scraped === false && u.firecrawl_fraud_signals?.length === 0
              ? "unknown"
              : (u.firecrawl_fraud_signals?.length > 0 || u.firecrawl_has_cred_form)
                ? "danger" : "clean"
          }
          statusLabel={
            !u.firecrawl_scraped
              ? "Page could not be scraped"
              : u.firecrawl_has_cred_form
                ? "⚠️ Credential form detected"
                : u.firecrawl_fraud_signals?.length > 0
                  ? `${u.firecrawl_fraud_signals.length} fraud phrase(s) found`
                  : "No fraud content found"
          }
        >
          {u.firecrawl_page_title && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 4px" }}>
              Page title: "{u.firecrawl_page_title}"
            </p>
          )}
          {u.firecrawl_has_cred_form && (
            <p style={{ fontSize: 12, color: "var(--danger)", fontWeight: 600, margin: "0 0 4px" }}>
              This page contains a form asking for OTP, PIN, or card details.
            </p>
          )}
          {u.firecrawl_fraud_signals?.length > 0 && (
            <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
              {u.firecrawl_fraud_signals.slice(0, 3).map((s: string, i: number) => (
                <li key={i} style={{ fontSize: 11, color: "var(--danger)", marginBottom: 2 }}>
                  "{s}"
                </li>
              ))}
            </ul>
          )}
          {!u.firecrawl_scraped && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Page requires JS or login — could not extract content.
            </p>
          )}
        </EvidenceCard>
      </div>

      {/* URLScan screenshot */}
      {u.urlscan_screenshot_url && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)",
                      background: "var(--bg-card)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)",
                        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>
              📸 Page screenshot (from URLScan.io)
            </p>
            {u.urlscan_report_url && (
              <a href={u.urlscan_report_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: "var(--accent)" }}>
                Full report →
              </a>
            )}
          </div>
          <img
            src={u.urlscan_screenshot_url}
            alt="URL screenshot"
            style={{ width: "100%", display: "block", maxHeight: 300, objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      {/* Reasons list — full narrative breakdown */}
      {u.reasons?.length > 0 && (
        <div style={{ borderRadius: 12, padding: "18px 20px", background: "var(--bg-card)",
                      border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 14, marginTop: 0 }}>
            📋 Evidence — why we say this is {vkey === "LEGITIMATE" ? "safe" : "dangerous"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {u.reasons.map((reason: string, i: number) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start",
                                    padding: "10px 14px", borderRadius: 8,
                                    background: vkey === "LEGITIMATE" ? "var(--success-bg)" : "var(--danger-bg)",
                                    border: `1px solid ${vkey === "LEGITIMATE" ? "var(--success-border)" : "var(--danger-border)"}` }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                  {vkey === "LEGITIMATE" ? "✅" : "🚨"}
                </span>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-primary)", margin: 0 }}>
                  {reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <ActionSection action={data.action} vkey={vkey} />
      <ResultActions vkey={vkey} onReset={() => onReset()} />
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────

function VerdictHeader({ vstyle, pct }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
      <span style={{ fontSize: 36, lineHeight: 1 }}>{vstyle.icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 800, fontSize: 18, color: vstyle.color, marginBottom: 2, marginTop: 0 }}>
          {vstyle.label}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Confidence: {pct}%
        </p>
      </div>
      <div style={{ background: vstyle.color, color: "#fff", fontWeight: 900,
                    fontSize: 20, padding: "6px 16px", borderRadius: 8, letterSpacing: "-0.02em" }}>
        {pct}%
      </div>
    </div>
  );
}

function ConfidenceBar({ pct, bar }: any) {
  return (
    <div style={{ height: 4, borderRadius: 4, background: "var(--border)",
                  overflow: "hidden", marginBottom: 16 }}>
      <div style={{ height: "100%", borderRadius: 4, width: `${pct}%`,
                    background: bar, transition: "width 0.8s ease" }} />
    </div>
  );
}

function Section({ label, children }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8, marginTop: 0 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function EvidenceCard({ icon, title, status, statusLabel, children }: {
  icon: string; title: string;
  status: "danger" | "clean" | "unknown" | "warning";
  statusLabel: string; children: React.ReactNode;
}) {
  const statusColors: Record<string, string> = {
    danger:  "var(--danger)",
    clean:   "var(--success)",
    warning: "var(--warning)",
    unknown: "var(--text-muted)",
  };
  const statusBgs: Record<string, string> = {
    danger:  "var(--danger-bg)",
    clean:   "var(--success-bg)",
    warning: "var(--warning-bg)",
    unknown: "var(--subtle)",
  };

  return (
    <div style={{ borderRadius: 10, padding: "14px 16px",
                  background: statusBgs[status],
                  border: `1px solid ${status === "danger" ? "var(--danger-border)"
                            : status === "clean" ? "var(--success-border)"
                            : "var(--border)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                       letterSpacing: "0.06em", color: "var(--text-muted)" }}>{title}</span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: statusColors[status],
                  margin: "0 0 6px" }}>
        {statusLabel}
      </p>
      {children}
    </div>
  );
}

function SenderCheckCard({ sender, vstyle }: any) {
  return (
    <Section label="Sender ID verification">
      <div style={{ padding: "12px 16px", borderRadius: 8, background: "var(--bg-card)",
                    border: `1px solid ${vstyle.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <code style={{ fontWeight: 700, fontSize: 14 }}>{sender.sender}</code>
            {sender.claimed_bank && (
              <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>
                ({sender.claimed_bank})
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700,
                         color: sender.status === "verified" ? "var(--success)" : "var(--danger)" }}>
            {sender.status === "verified"   ? "✅ Verified"    :
             sender.status === "known_fake" ? "❌ Known fake"  : "⚠️ Unrecognised"}
          </span>
        </div>
        {sender.real_sender_ids?.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
            Official IDs: {sender.real_sender_ids.slice(0,4).join(", ")}
          </p>
        )}
      </div>
    </Section>
  );
}

function ActionSection({ action, vkey }: any) {
  return (
    <>
      {action && (
        <div style={{ borderRadius: 10, padding: "14px 16px",
                      background: "var(--bg-card)", border: "1px solid var(--border)", marginTop: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8, marginTop: 0 }}>
            What to do
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)",
                      fontWeight: 500, margin: 0 }}>
            👉 {action}
          </p>
        </div>
      )}
      {vkey !== "LEGITIMATE" && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "var(--danger-bg)",
                      border: "1px solid var(--danger-border)",
                      display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <span style={{ fontSize: 13, color: "#b91c1c" }}>
            <strong>Already sent money?</strong> Call National Cyber Crime helpline: <strong>1930</strong>
          </span>
        </div>
      )}
    </>
  );
}

function ResultActions({ vkey, onReset }: any) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
      <button onClick={onReset} style={{
        flex: 1, padding: "10px 0", borderRadius: 10, background: "var(--bg-card)",
        border: "1px solid var(--border)", fontSize: 14, fontWeight: 500,
        cursor: "pointer", color: "var(--text-secondary)",
      }}>Check another →</button>
      <button onClick={() => navigator.clipboard?.writeText(window.location.href)}
        style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "var(--bg-card)",
                 border: "1px solid var(--border)", fontSize: 14, fontWeight: 500,
                 cursor: "pointer", color: "var(--text-secondary)" }}>
        Share result
      </button>
    </div>
  );
}