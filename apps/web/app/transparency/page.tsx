"use client";
import { useEffect, useState } from "react";

export default function TransparencyPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/stats/public`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main>
      {/* 🔥 HERO */}
      <section
        style={{
          background:
            "radial-gradient(circle at 50% 0%, #2563eb15, transparent 60%)",
          padding: "96px 24px 80px",
          textAlign: "center",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              marginBottom: 16,
            }}
          >
            Transparency Dashboard
          </h1>

          <p
            style={{
              fontSize: 17,
              color: "var(--muted)",
              lineHeight: 1.75,
              maxWidth: 640,
              margin: "0 auto",
            }}
          >
            FraudShield publishes its own accuracy metrics openly. No hidden
            scores — full track record.
          </p>
        </div>
      </section>

      {/* 🔥 MAIN CONTENT */}
      <section style={{ padding: "0 24px 48px" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {/* 🔥 STATS (OVERLAP HERO) */}
          <div
            style={{
              marginTop: -50,
              marginBottom: 40,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                label: "Total analyses",
                val: loading
                  ? "—"
                  : (stats?.total_analyses ?? 0).toLocaleString(),
              },
              {
                label: "Fraud detected",
                val: loading
                  ? "—"
                  : (stats?.fraud_detected ?? 0).toLocaleString(),
              },
              {
                label: "False positive rate",
                val: loading
                  ? "—"
                  : `${((stats?.false_positive_rate ?? 0) * 100).toFixed(
                      2
                    )}%`,
              },
              {
                label: "Model F1 score",
                val: loading
                  ? "—"
                  : `${((stats?.model_f1 ?? 0) * 100).toFixed(1)}%`,
              },
              {
                label: "Model version",
                val: loading ? "—" : stats?.model_version ?? "v1",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="card"
                style={{
                  padding: "22px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.val}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 6,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* 🔥 2 COLUMN LAYOUT */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 24,
            }}
          >
            {/* LEFT */}
            <div>
              {/* MODEL CARD */}
              <div className="card" style={{ padding: 28, marginBottom: 24 }}>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    marginBottom: 20,
                  }}
                >
                  Model — muril-fraud-v1
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  {[
                    { label: "Base model", val: "google/muril-base-cased" },
                    { label: "Training samples", val: "108,891" },
                    { label: "Validation F1", val: "0.9733" },
                    { label: "False positive rate", val: "1.13%" },
                    { label: "Languages", val: "English, Hindi" },
                    { label: "Trained on", val: "Google Colab T4 GPU" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: "12px 16px",
                        background: "var(--subtle)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        {item.label}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {item.val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🔥 SIMPLE VISUAL (CHART PLACEHOLDER) */}
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>
                  Detection Trend
                </h3>

                <div
                  style={{
                    height: 120,
                    borderRadius: 8,
                    background:
                      "linear-gradient(90deg, #2563eb20, transparent)",
                  }}
                />
              </div>
            </div>

            {/* RIGHT */}
            <div>
              <div className="card" style={{ padding: 28 }}>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    marginBottom: 16,
                  }}
                >
                  Evidence Layers
                </h2>

                {[
                  {
                    icon: "🤖",
                    name: "MuRIL AI Model",
                    detail:
                      "Fine-tuned transformer — 97.33% F1 on test samples",
                  },
                  {
                    icon: "📵",
                    name: "Sender ID Database",
                    detail:
                      "12 banks + RBI + NPCI — verified sources",
                  },
                  {
                    icon: "🔍",
                    name: "Domain Heuristics",
                    detail:
                      "Fake bank names, typosquatting detection",
                  },
                  {
                    icon: "🌐",
                    name: "Google Safe Browsing",
                    detail:
                      "10,000 checks/day phishing detection",
                  },
                  {
                    icon: "🔬",
                    name: "VirusTotal",
                    detail: "70+ engines scan",
                  },
                  {
                    icon: "🎣",
                    name: "PhishTank",
                    detail: "Community phishing database",
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: "12px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--muted)",
                          marginTop: 2,
                        }}
                      >
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}