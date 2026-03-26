export default function AboutPage() {
  return (
    <main>
      <section style={{ background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)", padding: "72px 24px 56px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🛡️</div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 16 }}>
            About FraudShield
          </h1>
          <p style={{ fontSize: 17, color: "var(--muted)", lineHeight: 1.75 }}>
            An academic project from SSN Institute of Technology, built to protect Indian banking customers from AI-generated fraud — before money is lost.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container-sm">
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>The Problem We're Solving</h2>
              <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: 15, marginBottom: 14 }}>
                AI-generated phishing messages are now grammatically flawless. They use real bank logos, spoofed sender IDs, and personalized details scraped from data breaches. Old red flags — bad grammar, generic greetings — no longer exist.
              </p>
              <p style={{ color: "var(--muted)", lineHeight: 1.8, fontSize: 15 }}>
                No tool currently available to Indian citizens performs deep content analysis on a suspicious message, explains why it looks fraudulent, and works in the channel where fraud arrives — WhatsApp and SMS.
              </p>
            </div>

            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>How We're Different</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { icon: "🤖", title: "Deep NLP analysis", desc: "Not keyword matching — a transformer that understands intent, context, and fraud structure." },
                  { icon: "📵", title: "Sender ID verification", desc: "Facts from official bank websites — not an algorithm's opinion." },
                  { icon: "🔗", title: "URL evidence", desc: "Domain age, Google Safe Browsing, VirusTotal, PhishTank — all in one check." },
                  { icon: "💬", title: "Plain language", desc: "Every verdict explains exactly what triggered it and what to do." },
                ].map(item => (
                  <div key={item.title} style={{ padding: "16px 18px", background: "var(--subtle)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 32 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>The Model</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
                {[
                  { val: "108,891", label: "Training samples" },
                  { val: "97.33%", label: "Validation F1" },
                  { val: "1.13%", label: "False positive rate" },
                  { val: "MuRIL", label: "Base model" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center", padding: "16px 12px", background: "var(--primary-light)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "var(--primary)", letterSpacing: "-0.02em" }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
                Fine-tuned on Google's MuRIL (Multilingual Representations for Indian Languages) using English, Hindi, and synthetic Indian banking SMS datasets. Trained on Google Colab with T4 GPU.
              </p>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}