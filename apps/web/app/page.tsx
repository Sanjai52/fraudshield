import Link from "next/link";

const STATS = [
  { val: "97.3%", label: "Detection accuracy" },
  { val: "1.1%",  label: "False positive rate" },
  { val: "12+",   label: "Banks verified" },
  { val: "<3s",   label: "Analysis time" },
];

const HOW = [
  { icon: "📋", step: "1", title: "Paste the message", desc: "Copy any suspicious SMS, email body, UPI alert, or URL directly into the analyser." },
  { icon: "🔍", step: "2", title: "AI analyses it",    desc: "MuRIL transformer + sender ID database + 4 external URL security APIs run in under 3 seconds." },
  { icon: "🛡️", step: "3", title: "Get clear proof",  desc: "HIGH RISK / SUSPICIOUS / SAFE verdict — with full evidence, sender verification, and one action step." },
];

const TRUSTED = ["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB", "RBI", "NPCI", "BOB", "Canara", "UBI", "Paytm"];

export default function Home() {
  return (
    <main>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section style={{ padding: "88px 24px 72px", textAlign: "center", background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div className="badge" style={{ background: "var(--primary-light)", color: "var(--primary)", marginBottom: 24, display: "inline-flex" }}>
            <span>⚡</span> Powered by Google MuRIL · F1 Score: 97.3%
          </div>

          <h1 style={{
            fontSize:      "clamp(36px, 6vw, 60px)",
            fontWeight:    900,
            lineHeight:    1.08,
            letterSpacing: "-0.03em",
            marginBottom:  24,
            color:         "var(--foreground)",
          }}>
            Is that message<br />
            <span style={{ color: "var(--primary)" }}>a scam?</span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "var(--muted)", lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: "0 auto 40px" }}>
            Paste any suspicious SMS, WhatsApp message, or URL. Get a clear verdict with full evidence in seconds — before you click.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <Link href="/analyse" className="btn-primary" style={{ fontSize: 16, padding: "14px 32px" }}>
              Check a message — it's free →
            </Link>
            <Link href="/about" className="btn-outline" style={{ fontSize: 16, padding: "13px 28px" }}>
              How it works
            </Link>
          </div>

          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            🔒 No message text stored · PII stripped before analysis · Zero tracking
          </p>
        </div>
      </section>

      {/* ── Inline analyser teaser ──────────────────────────── */}
      <section style={{ padding: "0 24px", marginTop: -32, marginBottom: 64 }}>
        <div className="card" style={{ maxWidth: 640, margin: "0 auto", padding: 28, boxShadow: "var(--shadow-md)" }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Try it now — paste a suspicious message</div>
          <textarea
            readOnly
            rows={3}
            placeholder='E.g. "SBI-KYC: Your account will be blocked. Verify at sbi-kyc.net immediately or your account will be permanently closed."'
            style={{ marginBottom: 14 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/analyse" className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
              Analyse message →
            </Link>
            <Link href="/analyse?tab=url" className="btn-outline">
              Check a URL
            </Link>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
            ✓ Free · ✓ No login required for 3 checks/day · ✓ Result in under 3 seconds
          </p>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "36px 24px", background: "var(--card)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "center", gap: "clamp(24px, 5vw, 72px)", flexWrap: "wrap" }}>
          {STATS.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, color: "var(--primary)", letterSpacing: "-0.03em" }}>{s.val}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="badge" style={{ background: "var(--subtle)", color: "var(--muted)", marginBottom: 16, display: "inline-flex" }}>How it works</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
              From suspicious message to clear verdict<br />in 3 steps
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {HOW.map(item => (
              <div key={item.step} className="card" style={{ padding: 28 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "var(--primary-light)", color: "var(--primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, marginBottom: 20,
                }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Step {item.step}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What we check ──────────────────────────────────── */}
      <section style={{ background: "var(--subtle)", padding: "80px 24px" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>
              Three layers of evidence — not just a score
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 540, margin: "0 auto" }}>
              Every verdict is backed by verifiable proof you can check yourself.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              {
                icon: "🤖", title: "AI Model",
                desc: "MuRIL transformer fine-tuned on 108,891 fraud and legitimate Indian banking messages. 97.3% F1 score.",
                tag: "google/muril-base-cased",
              },
              {
                icon: "📵", title: "Sender ID Verification",
                desc: "Checks the sender against verified IDs from 12 major Indian banks, sourced directly from official bank websites.",
                tag: "12 banks + RBI + NPCI",
              },
              {
                icon: "🔗", title: "URL Evidence",
                desc: "WHOIS domain age · Google Safe Browsing · VirusTotal (70+ engines) · PhishTank crowd-verified database.",
                tag: "4 external APIs",
              },
            ].map(item => (
              <div key={item.title} className="card" style={{ padding: 24, background: "white" }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>{item.desc}</p>
                <code style={{ fontSize: 12, background: "var(--subtle)", padding: "3px 8px", borderRadius: 4, color: "var(--primary)" }}>{item.tag}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted banks ──────────────────────────────────── */}
      <section className="section">
        <div className="container" style={{ textAlign: "center" }}>
          <div className="section-label" style={{ marginBottom: 24 }}>Sender IDs verified for</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {TRUSTED.map(b => (
              <span key={b} style={{
                padding:       "6px 16px",
                background:    "var(--card)",
                border:        "1px solid var(--border)",
                borderRadius:  20,
                fontSize:      13,
                fontWeight:    600,
                color:         "var(--foreground)",
              }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section style={{ background: "var(--primary)", padding: "72px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: 16 }}>
            Don't lose money to a scam.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.8)", marginBottom: 32, lineHeight: 1.6 }}>
            Check any suspicious message in seconds. Free, private, and backed by real evidence.
          </p>
          <Link href="/analyse" style={{
            display:         "inline-flex",
            alignItems:      "center",
            gap:             8,
            background:      "white",
            color:           "var(--primary)",
            fontWeight:      700,
            fontSize:        16,
            padding:         "14px 32px",
            borderRadius:    "var(--radius-sm)",
            textDecoration:  "none",
            boxShadow:       "0 4px 14px rgba(0,0,0,0.15)",
          }}>
            Analyse a message now →
          </Link>
          <p style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            No account needed · Results in under 3 seconds
          </p>
        </div>
      </section>

    </main>
  );
}