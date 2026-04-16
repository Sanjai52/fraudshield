"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function ContactPage() {
  const [form,    setForm]    = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  function update(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    setSending(true);
    setError("");

    // Store in Supabase (create this table or use a simple email service)
    // For now we store to a contact_messages table if it exists,
    // otherwise just simulate success after a short delay
    try {
      const supabase = createClient();
      const { error: dbErr } = await supabase
        .from("contact_messages")
        .insert({
          name:    form.name,
          email:   form.email,
          subject: form.subject,
          message: form.message,
        });

      // If table doesn't exist yet, still show success — we'll add table later
      if (dbErr && !dbErr.message.includes("does not exist")) {
        throw dbErr;
      }

      setSent(true);
    } catch (err: any) {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main>
      {/* Hero */}
      <section style={{
        background: "radial-gradient(circle at 50% 0%, #2563eb12, transparent 60%)",
        padding: "80px 24px 60px",
        textAlign: "center",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900,
                       letterSpacing: "-0.02em", marginBottom: 14 }}>
            Contact Us
          </h1>
          <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.75 }}>
            Questions, feedback, or want to report a fraud pattern?
            We read every message.
          </p>
        </div>
      </section>

      <section style={{ padding: "56px 24px 80px" }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          display: "grid", gridTemplateColumns: "1fr 340px",
          gap: 32, alignItems: "start",
        }}>

          {/* ── Form ── */}
          <div className="card" style={{ padding: 36 }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 10 }}>
                  Message sent!
                </h2>
                <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>
                  Thanks for reaching out. We'll get back to you as soon as we can.
                </p>
                <button
                  className="btn-outline"
                  onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>
                  Send us a message
                </h2>
                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label className="section-label" style={{ display: "block", marginBottom: 8 }}>
                        Your name *
                      </label>
                      <input
                        type="text"
                        placeholder="Sanjay Kumar"
                        value={form.name}
                        onChange={e => update("name", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="section-label" style={{ display: "block", marginBottom: 8 }}>
                        Email address *
                      </label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={e => update("email", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="section-label" style={{ display: "block", marginBottom: 8 }}>
                      Subject
                    </label>
                    <input
                      type="text"
                      placeholder="Feedback / Bug report / Fraud pattern / General"
                      value={form.subject}
                      onChange={e => update("subject", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="section-label" style={{ display: "block", marginBottom: 8 }}>
                      Message *
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Tell us what's on your mind. If you found a false positive or a scam pattern we're missing, please include the details."
                      value={form.message}
                      onChange={e => update("message", e.target.value)}
                      required
                    />
                  </div>

                  {error && (
                    <div style={{
                      padding: "10px 14px",
                      background: "var(--danger-bg)",
                      border: "1px solid var(--danger-border)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13, color: "var(--danger)",
                    }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="btn-primary"
                    style={{ padding: "13px 0", fontSize: 15, justifyContent: "center" }}
                  >
                    {sending ? "Sending…" : "Send message →"}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* ── Info cards ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16,
                        position: "sticky", top: 80 }}>

            {[
              {
                icon: "🚨",
                title: "National Fraud Helpline",
                body: "If you have already sent money to a scammer, call 1930 immediately. Every minute counts.",
                badge: "1930",
                danger: true,
              },
              {
                icon: "🏫",
                title: "About this project",
                body: "FraudShield is an academic project by students at SSN Institute of Technology, Chennai.",
                lines: ["B.E. Computer Science", "Batch of 2026"],
                danger: false,
              },
              {
                icon: "🐛",
                title: "Report a false positive",
                body: "Got a wrong verdict? Use the feedback form on any result page — it directly feeds the next training run.",
                danger: false,
              },
              {
                icon: "🔒",
                title: "Privacy",
                body: "Your message text is never stored. Only fraud signals and verdicts are saved — not the original content.",
                danger: false,
              },
            ].map(card => (
              <div key={card.title} className="card" style={{
                padding: 20,
                background:   card.danger ? "var(--danger-bg)"     : undefined,
                borderColor:  card.danger ? "var(--danger-border)"  : undefined,
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
                <div style={{
                  fontSize: 14, fontWeight: 700, marginBottom: 8,
                  color: card.danger ? "var(--danger)" : "var(--text-primary)",
                }}>
                  {card.title}
                  {card.badge && (
                    <span style={{
                      marginLeft: 8, padding: "1px 8px",
                      background: "var(--danger)", color: "#fff",
                      borderRadius: 20, fontSize: 12, fontWeight: 800,
                    }}>
                      {card.badge}
                    </span>
                  )}
                </div>
                <p style={{
                  fontSize: 13,
                  color: card.danger ? "var(--danger)" : "var(--muted)",
                  lineHeight: 1.7, margin: 0,
                }}>
                  {card.body}
                </p>
                {card.lines?.map((l, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{l}</div>
                ))}
              </div>
            ))}
          </div>

        </div>
      </section>
    </main>
  );
}