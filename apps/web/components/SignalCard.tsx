const SIGNAL_INFO: Record<string, { label: string; icon: string; desc: string; severity: "high" | "medium" }> = {
  urgency_pressure:   { label: "Urgency / Pressure",   icon: "⏰", desc: "Uses time pressure or threats to force you into acting immediately without thinking.", severity: "medium" },
  credential_harvest: { label: "Credential Harvest",   icon: "🔑", desc: "Attempts to collect your PIN, OTP, password, or personal banking information.",        severity: "high" },
  threat_language:    { label: "Threat Language",      icon: "⚠️", desc: "Mentions blocking account, legal action, arrest, or financial penalties.",             severity: "high" },
  fake_domain_hint:   { label: "Suspicious Domain",    icon: "🌐", desc: "Contains a URL pattern that does not match any official bank's registered domain.",    severity: "high" },
  fake_sender_id:     { label: "Fake Sender ID",       icon: "📵", desc: "The message sender is not on the official verified list for the bank it claims to be.", severity: "high" },
  malicious_url:      { label: "Malicious URL",        icon: "🔗", desc: "Link confirmed as malicious by Google Safe Browsing, VirusTotal, or PhishTank.",       severity: "high" },
};

export default function SignalCard({ signal }: { signal: string }) {
  const info = SIGNAL_INFO[signal] ?? {
    label:    signal.replace(/_/g, " "),
    icon:     "🚩",
    desc:     "Suspicious pattern detected in the message.",
    severity: "medium" as const,
  };

  const isHigh   = info.severity === "high";
  const color    = isHigh ? "var(--danger)"  : "var(--warning)";
  const bg       = isHigh ? "var(--danger-bg)"  : "var(--warning-bg)";
  const border   = isHigh ? "var(--danger-border)" : "var(--warning-border)";

  return (
    <div style={{
      display:      "flex",
      alignItems:   "flex-start",
      gap:          14,
      padding:      "14px 18px",
      background:   bg,
      border:       `1px solid ${border}`,
      borderLeft:   `3px solid ${color}`,
      borderRadius: "var(--radius-sm)",
    }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{info.icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 3 }}>{info.label}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{info.desc}</div>
      </div>
    </div>
  );
}