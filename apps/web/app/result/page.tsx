"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { storeAnalysis } from "@/lib/db";
import { createClient } from "@/lib/supabase";

const VERDICT_STYLE: Record<string, {
  border: string; bg: string; labelColor: string;
  icon: string; label: string; cardLabel: string;
}> = {
  HIGH_FRAUD: {
    border: "var(--danger)", bg: "var(--danger-bg)", labelColor: "var(--danger)",
    icon: "🚨", label: "HIGH FRAUD", cardLabel: "Why this is a scam",
  },
  SUSPICIOUS: {
    border: "var(--warning)", bg: "var(--warning-bg)", labelColor: "var(--warning)",
    icon: "⚠️", label: "SUSPICIOUS", cardLabel: "Why this looks suspicious",
  },
  LEGITIMATE: {
    border: "var(--success)", bg: "var(--success-bg)", labelColor: "var(--success)",
    icon: "✅", label: "LOOKS SAFE", cardLabel: "Analysis summary",
  },
};

// ── Evidence card ─────────────────────────────────────────────
function EvidenceCard({ icon, title, status, statusLabel, children }: {
  icon: string; title: string;
  status: "danger" | "clean" | "unknown" | "warning";
  statusLabel: string; children?: React.ReactNode;
}) {
  const bgs: Record<string, string> = {
    danger: "var(--danger-bg)", clean: "var(--success-bg)",
    warning: "var(--warning-bg)", unknown: "var(--bg-card)",
  };
  const borders: Record<string, string> = {
    danger: "var(--danger-border)", clean: "var(--success-border)",
    warning: "var(--warning-border)", unknown: "var(--border)",
  };
  const colors: Record<string, string> = {
    danger: "var(--danger)", clean: "var(--success)",
    warning: "var(--warning)", unknown: "var(--text-muted)",
  };
  return (
    <div style={{
      borderRadius: 10, padding: "14px 16px",
      background: bgs[status], border: `1px solid ${borders[status]}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                       letterSpacing: "0.06em", color: "var(--text-muted)" }}>{title}</span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: colors[status], margin: "0 0 6px" }}>
        {statusLabel}
      </p>
      {children}
    </div>
  );
}

export default function ResultPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      const stored = localStorage.getItem("fraud_result");
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored);
        const age    = parsed.timestamp ? Date.now() - parsed.timestamp : 0;
        if (age < 60000 || !parsed.timestamp) setData(parsed);
        localStorage.removeItem("fraud_result");

        // Save to Supabase
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        await storeAnalysis(parsed, parsed._tab ?? "text", user?.id ?? null);
      } catch (e) {
        console.error("Result parse error:", e);
        localStorage.removeItem("fraud_result");
      }
    };
    run();
  }, []);

  if (!data) return (
    <div style={{ maxWidth: 560, margin: "100px auto", textAlign: "center", padding: "0 24px" }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>🤔</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>No result found</h2>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>Analyse a message first to see results here.</p>
      <Link href="/analyse" className="btn-primary">Analyse a message →</Link>
    </div>
  );

  const isUrl         = data._tab === "url";
  const fp            = (data.fraud_probability as number) ?? 0;
  const displayVerdict = data.display_verdict ??
    (fp >= 0.80 ? "HIGH_FRAUD" : fp >= 0.50 ? "SUSPICIOUS" : "LEGITIMATE");
  const vstyle        = VERDICT_STYLE[displayVerdict] ?? VERDICT_STYLE["SUSPICIOUS"];
  const conf          = data.confidence ?? fp;
  const pct           = Math.round(conf * 100);

  // For URL results, get the first url_check object
  const u = data.url_checks?.[0] ?? {};

  return (
    <main style={{ background: "var(--subtle)", minHeight: "calc(100vh - 64px)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/analyse" style={{
          display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14,
          color: "var(--muted)", textDecoration: "none", marginBottom: 28,
        }}>← Analyse another</Link>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Verdict banner ── */}
          <div style={{
            borderRadius: 16, padding: "24px 28px",
            background: vstyle.bg, border: `1.5px solid ${vstyle.border}`,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <span style={{ fontSize: 40, lineHeight: 1 }}>{vstyle.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 900, fontSize: 22, color: vstyle.labelColor,
                            marginBottom: 4, marginTop: 0, letterSpacing: "-0.02em" }}>
                  {vstyle.label}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  Confidence: {pct}%
                </p>
              </div>
              <div style={{
                background: vstyle.labelColor, color: "#fff",
                fontWeight: 900, fontSize: 24, padding: "8px 20px",
                borderRadius: 10, letterSpacing: "-0.02em",
              }}>
                {pct}%
              </div>
            </div>

            {/* Confidence bar */}
            <div style={{ height: 5, borderRadius: 5, background: "rgba(0,0,0,0.1)",
                          overflow: "hidden", marginBottom: 20 }}>
              <div style={{ height: "100%", borderRadius: 5, width: `${pct}%`,
                            background: vstyle.labelColor, transition: "width 0.8s ease" }} />
            </div>

            {/* Input shown */}
            {data._input && (
              <div style={{ padding: "10px 14px", background: "rgba(0,0,0,0.04)",
                            borderRadius: 8, marginBottom: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: vstyle.labelColor,
                            opacity: 0.7, margin: "0 0 6px" }}>
                  {isUrl ? "URL checked" : "Message analysed"}
                </p>
                <code style={{ fontSize: 13, wordBreak: "break-all",
                               color: "var(--text-primary)", fontFamily: "monospace" }}>
                  {data._input}
                </code>
              </div>
            )}

            {/* Main explanation */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                          textTransform: "uppercase", color: vstyle.labelColor,
                          opacity: 0.7, marginBottom: 8, marginTop: 0 }}>
                {displayVerdict === "LEGITIMATE" ? "Why this looks safe" : "Why we flagged this"}
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-primary)", margin: 0 }}>
                {data.explanation || "Analysis complete."}
              </p>
            </div>
          </div>

          {/* ── URL evidence grid ── */}
          {isUrl && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                {/* Domain heuristics */}
                <EvidenceCard
                  icon="🔍" title="Domain Analysis"
                  status={u.heuristic_flags?.length > 0 ? "danger" : "clean"}
                  statusLabel={u.heuristic_flags?.length > 0
                    ? `${u.heuristic_flags.length} suspicious pattern(s)`
                    : "No suspicious patterns"}
                >
                  {u.heuristic_flags?.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {u.heuristic_flags.slice(0, 4).map((f: string, i: number) => (
                        <li key={i} style={{ fontSize: 11, color: "var(--text-primary)", marginBottom: 3, lineHeight: 1.4 }}>
                          {f.replace(/_/g, " ").replace(/:/g, ": ")}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                      Domain structure looks normal
                    </p>
                  )}
                </EvidenceCard>

                {/* Domain age */}
                <EvidenceCard
                  icon="📅" title="Domain Age"
                  status={
                    u.domain_age_days == null ? "unknown"
                    : u.domain_age_days < 30  ? "danger"
                    : u.domain_age_days < 90  ? "warning"
                    : "clean"
                  }
                  statusLabel={
                    u.domain_age_days == null ? "Could not determine"
                    : u.domain_age_days < 7   ? `${u.domain_age_days} day(s) old — very new!`
                    : u.domain_age_days < 30  ? `${u.domain_age_days} days old — brand new`
                    : u.domain_age_days < 90  ? `${u.domain_age_days} days old — relatively new`
                    : u.domain_age_days < 365 ? `${u.domain_age_days} days old`
                    : `${Math.floor(u.domain_age_days / 365)} year(s) old — established`
                  }
                >
                  {u.registrar && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                      Registrar: {u.registrar}
                    </p>
                  )}
                  {u.domain_country && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "3px 0 0" }}>
                      Country: {u.domain_country}
                    </p>
                  )}
                </EvidenceCard>

                {/* Google Safe Browsing */}
                <EvidenceCard
                  icon="🛡️" title="Google Safe Browsing"
                  status={u.safebrowsing_hit ? "danger" : "clean"}
                  statusLabel={u.safebrowsing_hit
                    ? `⚠️ Threat: ${u.safebrowsing_type ?? "phishing detected"}`
                    : "Not in threat database"}
                >
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    {u.safebrowsing_hit
                      ? "Google confirmed this URL is dangerous. Updated every 30 minutes across billions of URLs."
                      : "Scanned against Google's database of billions of known phishing and malware URLs."}
                  </p>
                </EvidenceCard>

                {/* VirusTotal */}
                <EvidenceCard
                  icon="🔬" title="VirusTotal"
                  status={(u.virustotal_malicious ?? 0) > 0 ? "danger" : "clean"}
                  statusLabel={
                    u.virustotal_score === "scan_pending" ? "Scan submitted"
                    : u.virustotal_score === "unknown"     ? "Not yet in database"
                    : (u.virustotal_malicious ?? 0) > 0   ? `${u.virustotal_malicious} engines flagged it`
                    : u.virustotal_score ?? "Clean"
                  }
                >
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    {(u.virustotal_malicious ?? 0) > 0
                      ? `${u.virustotal_malicious} independent security vendors confirmed this URL as malicious.`
                      : "70+ security engines (Kaspersky, Norton, McAfee, etc.) scanned this URL."}
                  </p>
                </EvidenceCard>

                {/* URLScan.io */}
                <EvidenceCard
                  icon="📡" title="URLScan.io"
                  status={u.urlscan_malicious ? "danger" : "clean"}
                  statusLabel={u.urlscan_malicious ? "Flagged as malicious" : "No threats detected"}
                >
                  {u.urlscan_tags?.length > 0 && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 3px" }}>
                      Tags: {u.urlscan_tags.slice(0, 3).join(", ")}
                    </p>
                  )}
                  {u.urlscan_country && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                      Server location: {u.urlscan_country}
                    </p>
                  )}
                  {u.urlscan_report_url && (
                    <a href={u.urlscan_report_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "var(--accent)", display: "block", marginTop: 4 }}>
                      View full scan →
                    </a>
                  )}
                </EvidenceCard>

                {/* Firecrawl live analysis */}
                <EvidenceCard
                  icon="🕷️" title="Live Page Analysis"
                  status={
                    !u.firecrawl_scraped ? "unknown"
                    : (u.firecrawl_has_cred_form || u.firecrawl_fraud_signals?.length > 0) ? "danger"
                    : "clean"
                  }
                  statusLabel={
                    !u.firecrawl_scraped
                      ? "Could not load page"
                      : u.firecrawl_has_cred_form
                        ? "⚠️ Credential-harvesting form found"
                        : u.firecrawl_fraud_signals?.length > 0
                          ? `${u.firecrawl_fraud_signals.length} fraud phrase(s) on page`
                          : "No fraud content found"
                  }
                >
                  {u.firecrawl_page_title && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 3px" }}>
                      Title: "{u.firecrawl_page_title}"
                    </p>
                  )}
                  {u.firecrawl_has_cred_form && (
                    <p style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600, margin: "0 0 3px" }}>
                      Page asks for OTP, PIN, or card details.
                    </p>
                  )}
                  {u.firecrawl_fraud_signals?.slice(0, 2).map((s: string, i: number) => (
                    <p key={i} style={{ fontSize: 11, color: "var(--danger)", margin: "2px 0 0" }}>
                      Found: "{s}"
                    </p>
                  ))}
                  {!u.firecrawl_scraped && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                      Page needs JavaScript or login to load.
                    </p>
                  )}
                </EvidenceCard>
              </div>

              {/* URLScan screenshot */}
              {u.urlscan_screenshot_url && (
                <div style={{ borderRadius: 12, overflow: "hidden",
                              border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)",
                                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                      📸 Page screenshot from URLScan.io
                    </span>
                    {u.urlscan_report_url && (
                      <a href={u.urlscan_report_url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "var(--accent)" }}>
                        Full report →
                      </a>
                    )}
                  </div>
                  <img src={u.urlscan_screenshot_url} alt="Page screenshot"
                    style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "cover" }}
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                  />
                </div>
              )}

              {/* Evidence reasons — the proof */}
              {(u.reasons?.length > 0 || data.reasons?.length > 0) && (
                <div style={{ borderRadius: 12, padding: "18px 20px",
                              background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                              textTransform: "uppercase", color: "var(--text-muted)",
                              marginBottom: 14, marginTop: 0 }}>
                    📋 Full evidence — why we say this is {displayVerdict === "LEGITIMATE" ? "safe" : "dangerous"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(u.reasons?.length > 0 ? u.reasons : data.reasons ?? []).map((r: string, i: number) => (
                      <div key={i} style={{
                        display: "flex", gap: 12, alignItems: "flex-start",
                        padding: "10px 14px", borderRadius: 8,
                        background: displayVerdict === "LEGITIMATE" ? "var(--success-bg)" : "var(--danger-bg)",
                        border: `1px solid ${displayVerdict === "LEGITIMATE" ? "var(--success-border)" : "var(--danger-border)"}`,
                      }}>
                        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                          {displayVerdict === "LEGITIMATE" ? "✅" : "🚨"}
                        </span>
                        <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-primary)", margin: 0 }}>
                          {r}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Text/image/voice signals ── */}
          {!isUrl && displayVerdict !== "LEGITIMATE" && data.signals?.length > 0 && (
            <div style={{ borderRadius: 12, padding: "18px 20px",
                          background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                          textTransform: "uppercase", color: "var(--danger)", marginBottom: 12, marginTop: 0 }}>
                Red flags ({data.signals.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.signals.map((s: string, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "9px 13px",
                                        borderRadius: 8, background: "var(--bg-card)",
                                        border: "1px solid var(--danger-border)" }}>
                    <span style={{ color: "var(--danger)", flexShrink: 0 }}>●</span>
                    <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                      {s.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sender check */}
          {data.sender_check && (
            <div style={{ borderRadius: 12, padding: "16px 20px",
                          background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                          textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10, marginTop: 0 }}>
                Sender ID verification
              </p>
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <code style={{ fontWeight: 700, fontSize: 14 }}>{data.sender_check.sender}</code>
                  {data.sender_check.claimed_bank && (
                    <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>
                      ({data.sender_check.claimed_bank})
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700,
                               color: data.sender_check.status === "verified" ? "var(--success)" : "var(--danger)" }}>
                  {data.sender_check.status === "verified"   ? "✅ Verified"    :
                   data.sender_check.status === "known_fake" ? "❌ Known fake"  : "⚠️ Unrecognised"}
                </span>
              </div>
              {data.sender_check.real_sender_ids?.length > 0 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
                  Official IDs: {data.sender_check.real_sender_ids.slice(0, 4).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* What to do */}
          {data.action && (
            <div style={{ borderRadius: 12, padding: "16px 20px",
                          background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                          textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8, marginTop: 0 }}>
                What to do
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)",
                          fontWeight: 500, margin: 0 }}>
                👉 {data.action}
              </p>
            </div>
          )}

          {/* Helpline */}
          {displayVerdict !== "LEGITIMATE" && (
            <div style={{ padding: "14px 18px", background: "var(--danger-bg)",
                          border: "1px solid var(--danger-border)", borderRadius: 10,
                          display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🚨</span>
              <span style={{ fontSize: 14, color: "var(--danger)" }}>
                <strong>Already sent money?</strong> Call National Cyber Crime helpline: <strong>1930</strong>
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/analyse" className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
              Analyse another →
            </Link>
            <button className="btn-outline"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              style={{ flex: 1, justifyContent: "center" }}>
              Copy result link
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}
