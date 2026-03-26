import Link from "next/link";
import Nav from "@/components/Nav";

const HOW_IT_WORKS = [
  { step: "01", title: "You submit content", desc: "Paste a message, URL, or upload a screenshot. We strip any personally identifiable information (PII) before it touches our models." },
  { step: "02", title: "NLP + URL analysis", desc: "Our fine-tuned BERT model analyses intent, urgency, and credential-harvesting patterns. For URLs, we run WHOIS, VirusTotal, and Google Safe Browsing checks." },
  { step: "03", title: "Verdict + explanation", desc: "You get a clear SAFE / SUSPICIOUS / DANGEROUS verdict with a confidence score and a plain-language explanation of what we found." },
  { step: "04", title: "Anonymised signal stored", desc: "Only feature vectors (never raw message text) are stored. These feed campaign detection — showing how many others received the same scam." },
];

const PRIVACY_ITEMS = [
  { icon: "❌", title: "No raw message text stored", desc: "We never save the original message you paste. Only anonymised feature vectors are retained." },
  { icon: "🔒", title: "PII stripped before processing", desc: "Phone numbers, account numbers, and names are removed before any model sees your content." },
  { icon: "🗑️", title: "URLs cached for 24 hours only", desc: "URL scan results are cached briefly to improve speed for repeated queries, then deleted." },
  { icon: "🎤", title: "Voice processed in-memory", desc: "Audio is never written to disk. It is processed transiently and discarded immediately after analysis." },
  { icon: "📊", title: "Aggregate stats only", desc: "Public stats are computed over anonymised data — never tied to individuals." },
  { icon: "🚫", title: "No data sold or shared", desc: "Your data is never sold to third parties or used for advertising." },
];

const MODEL_DETAILS = [
  { label: "Base model", value: "BERT / IndicBERT (HuggingFace)" },
  { label: "Training data", value: "Indian bank SMS datasets, PhishTank, curated scam corpora" },
  { label: "Target accuracy", value: "≥ 90% on held-out test set" },
  { label: "False positive target", value: "< 3%" },
  { label: "URL intelligence", value: "WHOIS · VirusTotal · Google Safe Browsing · PhishTank" },
  { label: "OCR engine", value: "Tesseract (screenshots)" },
  { label: "Voice analysis", value: "Librosa MFCC features" },
];

export default function TransparencyPage() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Nav active="transparency" />

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
            Transparency
          </p>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            How FraudShield works
          </h1>
          <p className="text-base leading-relaxed max-w-lg" style={{ color: "var(--text-secondary)" }}>
            We believe you should know exactly what happens to your data and how our models reach their conclusions.
          </p>
        </div>

        {/* Steps */}
        <section className="mb-14">
          <h2 className="text-base font-semibold mb-5" style={{ color: "var(--text-primary)" }}>Step by step</h2>
          <div className="space-y-3">
            {HOW_IT_WORKS.map(item => (
              <div key={item.step} className="flex gap-5 rounded-2xl px-5 py-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <span className="font-bold text-sm flex-shrink-0 mt-0.5 font-[family-name:var(--font-mono)]" style={{ color: "var(--accent)" }}>{item.step}</span>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section className="mb-14">
          <h2 className="text-base font-semibold mb-5" style={{ color: "var(--text-primary)" }}>Privacy commitments</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRIVACY_ITEMS.map(item => (
              <div key={item.title} className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <span className="text-xl">{item.icon}</span>
                <p className="text-sm font-semibold mt-2 mb-1" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Model details */}
        <section className="mb-14">
          <h2 className="text-base font-semibold mb-5" style={{ color: "var(--text-primary)" }}>Model & technology</h2>
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {MODEL_DETAILS.map((row, i) => (
              <div key={row.label} className="flex gap-4 px-5 py-3.5 text-sm" style={{ borderBottom: i !== MODEL_DETAILS.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span className="flex-shrink-0 w-40" style={{ color: "var(--text-muted)" }}>{row.label}</span>
                <span style={{ color: "var(--text-primary)" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Limitations */}
        <section className="mb-12">
          <h2 className="text-base font-semibold mb-5" style={{ color: "var(--text-primary)" }}>Known limitations</h2>
          <div className="rounded-2xl px-5 py-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {[
              "False positives are possible (~3%). Always apply your own judgment.",
              "Scam tactics evolve rapidly. Our models are updated periodically but may lag new attack patterns.",
              "Non-English and non-Indian-language content has lower accuracy.",
              "Voice deepfake detection is experimental and less reliable than text/URL analysis.",
            ].map((lim, i) => (
              <div key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="mt-0.5 flex-shrink-0">⚠️</span>
                {lim}
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <Link href="/analyse" className="inline-block font-semibold px-7 py-3 rounded-xl text-sm transition" style={{ background: "var(--accent)", color: "#fff" }}>
            Try it yourself →
          </Link>
        </div>
      </div>
    </div>
  );
}
