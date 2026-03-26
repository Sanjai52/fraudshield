"use client";

export default function Footer() {
  return (
    <footer style={{
      borderTop:  "1px solid var(--border)",
      background: "var(--card)",
      padding:    "48px 24px 32px",
      marginTop:  80,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>🛡️</span>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Fraud<span style={{ color: "var(--primary)" }}>Shield</span></span>
            </div>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, maxWidth: 280 }}>
              AI-powered fraud detection for Indian banking customers. Protecting you before money is lost.
            </p>
          </div>

          {[
            { title: "Product", links: ["Analyse Message", "Check URL", "Transparency", "How it works"] },
            { title: "Company", links: ["About Us", "Contact", "Blog", "Careers"] },
            { title: "Legal",   links: ["Privacy Policy", "Terms of Use", "Security"] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, letterSpacing: "0.04em" }}>{col.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.links.map(link => (
                  <a key={link} href="#"
                    style={{ fontSize: 14, color: "var(--muted)", textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--foreground)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}>
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            © 2026 FraudShield. Academic project — SSN Institute of Technology.
          </span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            National Fraud Helpline: <strong style={{ color: "var(--foreground)" }}>1930</strong>
          </span>
        </div>
      </div>
    </footer>
  );
}