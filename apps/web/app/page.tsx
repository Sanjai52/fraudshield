import Link from "next/link";
import Nav from "@/components/Nav";

const features = [
  { icon: "🧠", title: "AI-powered NLP", desc: "BERT model trained on Indian scam patterns" },
  { icon: "🌐", title: "URL intelligence", desc: "WHOIS, VirusTotal, Google Safe Browsing" },
  { icon: "🖼️", title: "Screenshot OCR", desc: "Extract and analyse text from images" },
  { icon: "🎤", title: "Voice analysis", desc: "Detect deepfake and synthetic audio" },
  { icon: "🏦", title: "Sender ID check", desc: "Cross-reference official bank sender IDs" },
  { icon: "📊", title: "Campaign detection", desc: "See how many others got the same scam" },
];

const privacy = [
  { icon: "❌", label: "No raw message stored" },
  { icon: "🔒", label: "PII stripped before processing" },
  { icon: "🗑️", label: "URLs cached 24h only" },
  { icon: "🎤", label: "Voice processed in-memory" },
];

export default function HomePage() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Nav />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-20">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold mb-7"
          style={{
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent-border)",
            color: "var(--accent)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "var(--accent)" }}
          />
          AI-powered scam detection for India
        </div>

        <h1
          className="text-5xl sm:text-6xl font-bold leading-[1.08] tracking-tight mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Detect scams
          <br />
          before you click.
        </h1>

        <p
          className="text-lg leading-relaxed mb-10 max-w-xl"
          style={{ color: "var(--text-secondary)" }}
        >
          Paste any suspicious SMS, WhatsApp message, or link. FraudShield
          analyses it with AI and tells you instantly — with a clear explanation.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm transition-all duration-150"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Check a message →
          </Link>
          <Link
            href="/transparency"
            className="inline-flex items-center gap-2 font-medium px-6 py-3 rounded-xl text-sm transition-all duration-150"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            How it works
          </Link>
        </div>
      </section>

      {/* Features */}
      <section
        className="border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-4xl mx-auto px-8 py-16">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-8"
            style={{ color: "var(--text-muted)" }}
          >
            What we analyse
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-5 transition-all duration-150"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <span className="text-2xl">{f.icon}</span>
                <p
                  className="text-sm font-semibold mt-3 mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {f.title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy strip */}
      <section
        className="border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-4xl mx-auto px-8 py-10 flex flex-wrap gap-x-10 gap-y-3">
          {privacy.map((p) => (
            <span
              key={p.label}
              className="flex items-center gap-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {p.icon} {p.label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
