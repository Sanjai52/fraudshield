import Analyser from "@/components/Analyser";

export default function AnalysePage() {
  return (
    <main style={{ background: "var(--subtle)", minHeight: "calc(100vh - 64px)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 360px", gap: 32, alignItems: "start" }}>

        {/* Left — Analyser */}
        <div>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>
              Analyse a message or URL
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6 }}>
              Paste any suspicious content and get a full AI + evidence analysis in seconds.
            </p>
          </div>

          <div className="card" style={{ padding: 28 }}>
            <Analyser />
          </div>
        </div>

        {/* Right — Info panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 88 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>What we check</div>
            {[
              { icon: "🤖", label: "MuRIL AI model",       val: "97.3% accuracy" },
              { icon: "📵", label: "Sender ID",             val: "12 banks verified" },
              { icon: "🌐", label: "Google Safe Browsing",  val: "Free — 10k/day" },
              { icon: "🔬", label: "VirusTotal",            val: "70+ engines" },
              { icon: "🎣", label: "PhishTank",             val: "Crowd-verified" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{item.icon} {item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>{item.val}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20, background: "var(--danger-bg)", borderColor: "var(--danger-border)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>🚨 Fraud helpline</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "var(--danger)", letterSpacing: "-0.02em" }}>1930</div>
            <p style={{ fontSize: 12, color: "var(--danger)", opacity: 0.8, marginTop: 4 }}>
              National Cyber Crime helpline — call immediately if you have already sent money.
            </p>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🔒 Privacy</div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
              Your message is never stored. PII (phone numbers, account details) is stripped before analysis. Zero tracking.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}