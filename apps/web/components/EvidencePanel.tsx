import SignalCard from "./SignalCard";

interface URLCheck {
  url: string; domain: string; verdict: string;
  domain_age_days: number | null; safebrowsing_hit: boolean;
  virustotal_score: string; virustotal_malicious: number; phishtank_hit: boolean;
}

interface SenderCheck {
  sender: string; status: "verified" | "known_fake" | "unknown";
  claimed_bank: string | null; real_sender_ids: string[];
  helpline: string | null; source: string | null;
}

interface Props {
  signals: string[]; sender_check: SenderCheck | null;
  url_checks: URLCheck[]; explanation: string;
}

function SenderRow({ s }: { s: SenderCheck }) {
  const isVerified = s.status === "verified";
  const isFake     = s.status === "known_fake";
  const color      = isVerified ? "var(--success)" : isFake ? "var(--danger)" : "var(--warning)";
  const bg         = isVerified ? "var(--success-bg)" : isFake ? "var(--danger-bg)" : "var(--warning-bg)";
  const border     = isVerified ? "var(--success-border)" : isFake ? "var(--danger-border)" : "var(--warning-border)";
  const label      = isVerified ? "✅ Verified sender" : isFake ? "❌ Known fake sender" : "⚠️ Unrecognised sender";

  return (
    <div style={{ padding: "18px 20px", background: bg, border: `1.5px solid ${border}`, borderRadius: "var(--radius-sm)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <code style={{ fontWeight: 800, fontSize: 15, color, background: "rgba(255,255,255,0.6)", padding: "2px 10px", borderRadius: 6 }}>{s.sender}</code>
          {s.claimed_bank && <span style={{ fontSize: 14, color: "var(--muted)" }}>{s.claimed_bank}</span>}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
      </div>

      {!isVerified && s.real_sender_ids.length > 0 && (
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
          <strong>Official sender IDs: </strong>
          {s.real_sender_ids.slice(0, 5).map(id => (
            <code key={id} style={{ background: "rgba(255,255,255,0.7)", padding: "1px 8px", borderRadius: 4, marginRight: 6, fontSize: 12, fontWeight: 600 }}>{id}</code>
          ))}
        </div>
      )}
      {s.helpline && (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Bank helpline: <strong style={{ color: "var(--foreground)" }}>{s.helpline}</strong>
        </div>
      )}
      {s.source && (
        <div style={{ marginTop: 8 }}>
          <a href={s.source} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color, textDecoration: "underline" }}>
            View official source →
          </a>
        </div>
      )}
    </div>
  );
}

function URLRow({ u }: { u: URLCheck }) {
  const isBad   = u.verdict === "MALICIOUS" || u.verdict === "SUSPICIOUS";
  const color   = u.verdict === "MALICIOUS" ? "var(--danger)" : u.verdict === "SUSPICIOUS" ? "var(--warning)" : "var(--success)";
  const bg      = u.verdict === "MALICIOUS" ? "var(--danger-bg)" : u.verdict === "SUSPICIOUS" ? "var(--warning-bg)" : "var(--success-bg)";
  const border  = u.verdict === "MALICIOUS" ? "var(--danger-border)" : u.verdict === "SUSPICIOUS" ? "var(--warning-border)" : "var(--success-border)";
  const label   = u.verdict === "MALICIOUS" ? "❌ Malicious" : u.verdict === "SUSPICIOUS" ? "⚠️ Suspicious" : u.verdict === "CLEAN" ? "✅ Clean" : "❓ Unverified";

  const rows = [
    { label: "Domain age",     val: u.domain_age_days != null ? `${u.domain_age_days} days old` : "Unknown", flag: u.domain_age_days != null && u.domain_age_days < 30 },
    { label: "Safe Browsing",  val: u.safebrowsing_hit ? "⚠️ Flagged" : "✅ Clean",             flag: u.safebrowsing_hit },
    { label: "VirusTotal",     val: u.virustotal_score ?? "—",                                  flag: u.virustotal_malicious > 0 },
    { label: "PhishTank",      val: u.phishtank_hit ? "⚠️ In database" : "✅ Not listed",       flag: u.phishtank_hit },
  ];

  return (
    <div style={{ padding: "18px 20px", background: bg, border: `1.5px solid ${border}`, borderRadius: "var(--radius-sm)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <code style={{ fontSize: 13, wordBreak: "break-all", color }}>{u.domain}</code>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {rows.map(item => (
          <div key={item.label} style={{
            padding:       "8px 12px",
            background:    "rgba(255,255,255,0.6)",
            borderRadius:  6,
            fontSize:      13,
          }}>
            <div style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontWeight: 600, color: item.flag ? color : "var(--foreground)" }}>{item.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EvidencePanel({ signals, sender_check, url_checks, explanation }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Explanation */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <div className="section-label">Analysis summary</div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: "var(--foreground)", marginTop: 8 }}>{explanation}</p>
      </div>

      {/* Signals */}
      {signals.length > 0 && (
        <div>
          <div className="section-label">Fraud signals detected ({signals.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {signals.map(s => <SignalCard key={s} signal={s} />)}
          </div>
        </div>
      )}

      {/* Sender check */}
      {sender_check && (
        <div>
          <div className="section-label">Sender ID verification</div>
          <div style={{ marginTop: 10 }}>
            <SenderRow s={sender_check} />
          </div>
        </div>
      )}

      {/* URL checks */}
      {url_checks.length > 0 && (
        <div>
          <div className="section-label">URL checks ({url_checks.length} link{url_checks.length > 1 ? "s" : ""})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {url_checks.map(u => <URLRow key={u.url} u={u} />)}
          </div>
        </div>
      )}
    </div>
  );
}