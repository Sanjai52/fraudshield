"use client";

import { useState, useRef } from "react";
import { analyseText, analyseUrl, analyseImage, analyseVoice } from "@/lib/api";
import type { DisplayVerdict } from "@/lib/types";

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
    icon: "🚨",
    label: "Dangerous — Likely Scam",
    color: "var(--danger)",
    bg: "var(--danger-bg)",
    border: "var(--danger-border)",
    bar: "var(--danger)",
  };

  if (v === "SUSPICIOUS") return {
    icon: "⚠️",
    label: "Suspicious — Treat with caution",
    color: "var(--warning)",
    bg: "var(--warning-bg)",
    border: "var(--warning-border)",
    bar: "var(--warning)",
  };

  return {
    icon: "✅",
    label: "Looks Safe",
    color: "var(--success)",
    bg: "var(--success-bg)",
    border: "var(--success-border)",
    bar: "var(--success)",
  };
}

// ── Normalise any backend response → standard display shape ───
function normalise(raw: any, tab: Tab, input: string): any {
  const data = { ...raw, _input: input, _tab: tab };

  // URL pipeline returns a flat object — reshape it
  if (tab === "url") {
    const v = raw.verdict ?? "UNKNOWN";
    data.display_verdict =
      v === "MALICIOUS"  ? "HIGH_FRAUD"  :
      v === "SUSPICIOUS" ? "SUSPICIOUS"  : "LEGITIMATE";
    data.confidence        = raw.evidence_count > 0 ? 0.9 : 0.5;
    data.fraud_probability = raw.evidence_count > 0 ? 0.9 : 0.1;
    data.signals           = raw.heuristic_flags ?? [];
    data.sender_check      = null;
    data.url_checks        = [{
      url:                  raw.url,
      domain:               raw.domain,
      verdict:              v,
      domain_age_days:      raw.domain_age_days,
      safebrowsing_hit:     raw.safebrowsing_hit,
      virustotal_malicious: raw.virustotal_malicious,
      virustotal_score:     raw.virustotal_score,
      phishtank_hit:        raw.phishtank_hit,
    }];
    data.model_version = "v1";
    data.language      = "en";
    return data;
  }

  // Text / screenshot / voice — escalate display_verdict if signals are strong
  const fp      = (data.fraud_probability as number) ?? 0;
  const signals = (data.signals as string[])         ?? [];
  const STRONG  = new Set(["urgency_pressure","credential_harvest","threat_language","fake_domain_hint","fake_sender_id"]);
  const hits    = signals.filter(s => STRONG.has(s)).length;

  if (!data.display_verdict || data.display_verdict === "LEGITIMATE") {
    if      (hits >= 3)              data.display_verdict = "HIGH_FRAUD";
    else if (hits >= 2)              data.display_verdict = "SUSPICIOUS";
    else if (hits >= 1 && fp >= 0.35) data.display_verdict = "SUSPICIOUS";
    else if (!data.display_verdict)  data.display_verdict =
      fp >= 0.80 ? "HIGH_FRAUD" : fp >= 0.50 ? "SUSPICIOUS" : "LEGITIMATE";
  }

  return data;
}

// ── Main component ────────────────────────────────────────────
export default function AnalysePage() {
  const [tab,        setTab]        = useState<Tab>("text");
  const [text,       setText]       = useState("");
  const [url,        setUrl]        = useState("");
  const [imgFile,    setImgFile]    = useState<File | null>(null);
  const [audioFile,  setAudioFile]  = useState<File | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [result,     setResult]     = useState<any>(null);

  const imgRef   = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  function switchTab(t: Tab) {
    setTab(t); setError(""); setResult(null);
    setText(""); setUrl(""); setImgFile(null); setAudioFile(null);
  }

  async function handleAnalyse() {
    setError(""); setResult(null);

    if (tab === "text"       && !text.trim())    { setError("Paste a message to analyse."); return; }
    if (tab === "url"        && !url.trim())      { setError("Enter a URL to check."); return; }
    if (tab === "screenshot" && !imgFile)         { setError("Select a screenshot first."); return; }
    if (tab === "voice"      && !audioFile)       { setError("Select a voice file first."); return; }

    setLoading(true);
    try {
      let raw: any;
      if      (tab === "text")       raw = await analyseText(text.trim());
      else if (tab === "url")        raw = await analyseUrl(url.trim());
      else if (tab === "screenshot") raw = await analyseImage(imgFile!);
      else                           raw = await analyseVoice(audioFile!);

      const input =
        tab === "text"       ? text.trim()      :
        tab === "url"        ? url.trim()        :
        tab === "screenshot" ? imgFile!.name     :
                               audioFile!.name;

      setResult(normalise(raw, tab, input));
    } catch (err: any) {
      setError(
        err.message?.includes("fetch") || err.message?.includes("Failed")
          ? "Cannot reach the API. Make sure the server is running on port 3001."
          : (err.message ?? "Something went wrong. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Derived display values ────────────────────────────────
  const vkey   = result?.display_verdict ?? null;
  const vstyle = vkey ? getVerdictStyle(vkey) : null;
  const pct    = result ? Math.round((result.confidence ?? 0) * 100) : 0;

  // ── Drop zone style helper ────────────────────────────────
  const dropZone = (active: boolean): React.CSSProperties => ({
    marginTop:   8,
    border:      `2px dashed ${active ? "var(--accent)" : "var(--border)"}`,
    borderRadius: "var(--radius-sm)",
    padding:     "28px 20px",
    textAlign:   "center",
    cursor:      "pointer",
    background:  active ? "var(--accent-subtle)" : "var(--bg-card)",
    transition:  "all 0.15s",
  });

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* ── Header ─────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "clamp(22px,4vw,30px)", fontWeight: 800,
                       letterSpacing: "-0.02em", marginBottom: 6,
                       color: "var(--text-primary)" }}>
            Is this message a scam?
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)" }}>
            Paste suspicious content below — full AI + evidence analysis in seconds.
          </p>
        </div>

        {/* ── Tabs ───────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20,
                      padding: 4, borderRadius: 10, width: "fit-content",
                      background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => switchTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 8,
                fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
                transition: "all 0.15s",
                background: tab === t.key ? "var(--accent)"    : "transparent",
                color:      tab === t.key ? "#fff"             : "var(--text-muted)",
              }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ── Input card ─────────────────────────────────── */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)",
                      borderRadius: 16, padding: 20,
                      boxShadow: "var(--shadow-card)", marginBottom: 16 }}>

          {/* Text */}
          {tab === "text" && (
            <textarea
              rows={6}
              placeholder="Paste the suspicious SMS or WhatsApp message here…"
              value={text}
              onChange={e => setText(e.target.value)}
              style={{ border: "none", outline: "none", resize: "none",
                       width: "100%", background: "transparent",
                       fontSize: 14, color: "var(--text-primary)",
                       lineHeight: 1.7, fontFamily: "inherit" }}
            />
          )}

          {/* URL */}
          {tab === "url" && (
            <input
              type="text"
              placeholder="https://suspicious-link.com/login"
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={{ border: "none", outline: "none", width: "100%",
                       background: "transparent", fontSize: 14,
                       color: "var(--text-primary)", fontFamily: "inherit",
                       padding: "6px 0" }}
            />
          )}

          {/* Screenshot */}
          {tab === "screenshot" && (
            <>
              <div style={dropZone(!!imgFile)} onClick={() => imgRef.current?.click()}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
                {imgFile ? (
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
                    {imgFile.name} &nbsp;·&nbsp; {(imgFile.size/1024).toFixed(0)} KB
                  </p>
                ) : (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                      Click to upload screenshot
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>PNG · JPG · WEBP · max 10 MB</p>
                  </>
                )}
              </div>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { setImgFile(e.target.files?.[0] ?? null); setError(""); }} />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                Text is extracted via OCR then run through the full fraud analysis pipeline.
              </p>
            </>
          )}

          {/* Voice */}
          {tab === "voice" && (
            <>
              <div style={dropZone(!!audioFile)} onClick={() => audioRef.current?.click()}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎙️</div>
                {audioFile ? (
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
                    {audioFile.name} &nbsp;·&nbsp; {(audioFile.size/1024).toFixed(0)} KB
                  </p>
                ) : (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                      Click to upload voice note
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>MP3 · WAV · OGG · M4A · max 25 MB</p>
                  </>
                )}
              </div>
              <input ref={audioRef} type="file" accept="audio/*" style={{ display: "none" }}
                onChange={e => { setAudioFile(e.target.files?.[0] ?? null); setError(""); }} />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                MFCC features analysed to detect AI-generated / deepfake voice patterns.
              </p>
            </>
          )}

          {/* Submit row */}
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginTop: 16,
                        paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {["🔒 No text stored", "⚡ Under 3s", "🏦 12 banks"].map(b => (
                <span key={b} style={{ fontSize: 12, color: "var(--text-muted)" }}>{b}</span>
              ))}
            </div>
            <button
              onClick={handleAnalyse}
              disabled={loading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 24px", borderRadius: 10,
                background: "var(--accent)", color: "#fff",
                fontWeight: 600, fontSize: 14, border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, transition: "opacity 0.15s",
                flexShrink: 0,
              }}>
              {loading && (
                <span style={{
                  width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  display: "inline-block", animation: "fs-spin 0.7s linear infinite",
                }} />
              )}
              {loading ? "Analysing…" :
                tab === "text"       ? "Analyse message →" :
                tab === "url"        ? "Check URL →"        :
                tab === "screenshot" ? "Analyse screenshot →" :
                                       "Analyse voice →"}
            </button>
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────── */}
        {error && (
          <div style={{
            padding: "12px 16px", marginBottom: 16,
            background: "var(--danger-bg)", border: "1px solid var(--danger-border)",
            borderRadius: 10, fontSize: 14, color: "var(--danger)",
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Result card ────────────────────────────────── */}
        {result && vstyle && (
          <div style={{
            borderRadius: 16, padding: 24,
            background: vstyle.bg, border: `1.5px solid ${vstyle.border}`,
            boxShadow: "var(--shadow-card)",
          }}>

            {/* Verdict header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <span style={{ fontSize: 36, lineHeight: 1 }}>{vstyle.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: 18, color: vstyle.color, marginBottom: 2 }}>
                  {vstyle.label}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Model confidence: {pct}%
                </p>
              </div>
              {/* Confidence badge */}
              <div style={{
                background: vstyle.color, color: "#fff",
                fontWeight: 900, fontSize: 20, padding: "6px 16px",
                borderRadius: 8, letterSpacing: "-0.02em",
              }}>
                {pct}%
              </div>
            </div>

            {/* Confidence bar */}
            <div style={{ height: 4, borderRadius: 4, background: "var(--border)",
                          overflow: "hidden", marginBottom: 20 }}>
              <div style={{ height: "100%", borderRadius: 4,
                            width: `${pct}%`, background: vstyle.bar,
                            transition: "width 0.8s ease" }} />
            </div>

            {/* Explanation */}
            {result.explanation && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "var(--text-muted)",
                            marginBottom: 8 }}>
                  {vkey === "LEGITIMATE" ? "Analysis summary" : "Why we flagged this"}
                </p>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-primary)" }}>
                  {result.explanation}
                </p>
              </div>
            )}

            {/* Signals */}
            {vkey !== "LEGITIMATE" && result.signals?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "var(--text-muted)",
                            marginBottom: 10 }}>
                  Red flags ({result.signals.length})
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.signals.map((s: string, i: number) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 14px", borderRadius: 8,
                      background: "var(--bg-card)",
                      border: `1px solid ${vstyle.border}`,
                    }}>
                      <span style={{ color: vstyle.color, marginTop: 1, flexShrink: 0 }}>●</span>
                      <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                        {s.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sender check */}
            {result.sender_check && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "var(--text-muted)",
                            marginBottom: 8 }}>
                  Sender ID verification
                </p>
                <div style={{
                  padding: "12px 16px", borderRadius: 8,
                  background:"var(--bg-card)",
                  border: `1px solid ${vstyle.border}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                                alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <code style={{ fontWeight: 700, fontSize: 14 }}>
                        {result.sender_check.sender}
                      </code>
                      {result.sender_check.claimed_bank && (
                        <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>
                          ({result.sender_check.claimed_bank})
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: result.sender_check.status === "verified"
                        ? "var(--success)" : "var(--danger)",
                    }}>
                      {result.sender_check.status === "verified"   ? "✅ Verified"    :
                       result.sender_check.status === "known_fake" ? "❌ Known fake"  :
                                                                      "⚠️ Unrecognised"}
                    </span>
                  </div>
                  {result.sender_check.real_sender_ids?.length > 0 && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                      Official IDs:&nbsp;
                      {result.sender_check.real_sender_ids.slice(0,4).join(", ")}
                    </p>
                  )}
                  {result.sender_check.helpline && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      Helpline: <strong style={{ color: "var(--text-primary)" }}>
                        {result.sender_check.helpline}
                      </strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* URL checks */}
            {result.url_checks?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "var(--text-muted)",
                            marginBottom: 8 }}>
                  URL checks
                </p>
                {result.url_checks.map((u: any, i: number) => (
                  <div key={i} style={{
                    padding: "14px 16px", borderRadius: 8,
                    background:"var(--bg-card)",
                    border: `1px solid ${vstyle.border}`, marginBottom: 8,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                                  alignItems: "center", marginBottom: 10 }}>
                      <code style={{ fontSize: 13, wordBreak: "break-all" }}>{u.domain}</code>
                      <span style={{ fontSize: 12, fontWeight: 700,
                                     color: u.verdict === "MALICIOUS" ? "var(--danger)"
                                          : u.verdict === "SUSPICIOUS" ? "var(--warning)"
                                          : "var(--success)", marginLeft: 8, flexShrink: 0 }}>
                        {u.verdict === "MALICIOUS"  ? "❌ Malicious"  :
                         u.verdict === "SUSPICIOUS" ? "⚠️ Suspicious" :
                         u.verdict === "CLEAN"      ? "✅ Clean"      : "❓ Unknown"}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: "Domain age",    val: u.domain_age_days != null ? `${u.domain_age_days} days` : "—",   flag: u.domain_age_days != null && u.domain_age_days < 30 },
                        { label: "Safe Browsing", val: u.safebrowsing_hit  ? "⚠️ Flagged"      : "✅ Clean",             flag: !!u.safebrowsing_hit },
                        { label: "VirusTotal",    val: u.virustotal_score  ?? "—",                                       flag: (u.virustotal_malicious ?? 0) > 0 },
                        { label: "PhishTank",     val: u.phishtank_hit     ? "⚠️ In database"  : "✅ Not listed",        flag: !!u.phishtank_hit },
                      ].map(item => (
                        <div key={item.label} style={{
                          padding: "8px 12px", borderRadius: 6,
                          background: "var(--bg-card)",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)",
                                        fontWeight: 600, marginBottom: 2,
                                        textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600,
                                        color: item.flag ? "var(--danger)" : "var(--text-primary)" }}>
                            {item.val}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action */}
            {result.action && (
              <div style={{
                marginTop: 16, paddingTop: 16,
                borderTop: `1px solid ${vstyle.border}`,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "var(--text-muted)",
                            marginBottom: 8 }}>
                  What to do
                </p>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)",
                            fontWeight: 500 }}>
                  👉 {result.action}
                </p>
              </div>
            )}

            {/* Helpline */}
            {vkey !== "LEGITIMATE" && (
              <div style={{
                marginTop: 16, padding: "12px 16px", borderRadius: 8,
                background: "var(--danger-bg)",
border: "1px solid var(--danger-border)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>🚨</span>
                <span style={{ fontSize: 13, color: "#b91c1c" }}>
                  <strong>Already sent money?</strong> Call National Cyber Crime helpline: <strong>1930</strong>
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
              <button
                onClick={() => { setResult(null); setText(""); setUrl(""); }}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10,
                  background: "var(--bg-card)",
                  border: `1px solid ${vstyle.border}`,
                  fontSize: 14, fontWeight: 500, cursor: "pointer",
                  color: "var(--text-secondary)",
                }}>
                Check another →
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10,
                  background: "var(--bg-card)",
                  border: `1px solid ${vstyle.border}`,
                  fontSize: 14, fontWeight: 500, cursor: "pointer",
                  color: "var(--text-secondary)",
                }}>
                Share result
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes fs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
