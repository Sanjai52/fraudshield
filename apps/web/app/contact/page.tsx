export default function ContactPage() {
  return (
    <main>
      <section style={{ background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)", padding: "72px 24px 56px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 16 }}>
            Contact Us
          </h1>
          <p style={{ fontSize: 17, color: "var(--muted)", lineHeight: 1.75 }}>
            Questions, feedback, or want to report a fraud pattern? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 360px", gap: 32, alignItems: "start" }}>

          {/* Form */}
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Send us a message</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Your name</div>
                <input type="text" placeholder="Sanjay Kumar" />
              </div>
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Email address</div>
                <input type="email" placeholder="you@example.com" />
              </div>
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Subject</div>
                <input type="text" placeholder="Feedback / Bug report / Fraud pattern" />
              </div>
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Message</div>
                <textarea rows={5} placeholder="Tell us what's on your mind..." />
              </div>
              <button className="btn-primary" style={{ padding: "13px 0", fontSize: 15 }}>
                Send message →
              </button>
            </div>
          </div>

          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 88 }}>
            {[
              {
                icon: "🏫", title: "Institution",
                lines: ["SSN Institute of Technology", "Chennai, Tamil Nadu", "Academic Project — 2026"],
              },
              {
                icon: "🚨", title: "National Fraud Helpline",
                lines: ["Call 1930 immediately", "if you have already sent money", "to a fraudster."],
                highlight: true,
              },
              {
                icon: "🐛", title: "Report a bug",
                lines: ["Found a false positive?", "Submit via the feedback button", "on any result page."],
              },
            ].map(card => (
              <div key={card.title} className="card" style={{
                padding: 20,
                background: card.highlight ? "var(--danger-bg)" : undefined,
                borderColor: card.highlight ? "var(--danger-border)" : undefined,
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: card.highlight ? "var(--danger)" : "var(--foreground)" }}>{card.title}</div>
                {card.lines.map((l, i) => (
                  <div key={i} style={{ fontSize: 13, color: card.highlight ? "var(--danger)" : "var(--muted)", lineHeight: 1.7 }}>{l}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}