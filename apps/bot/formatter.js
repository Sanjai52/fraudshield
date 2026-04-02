function formatVerdict(result) {
  const v   = result.display_verdict ?? result.verdict ?? "UNKNOWN";
  const pct = Math.round((result.confidence ?? 0) * 100);

  const header =
    v === "HIGH_FRAUD" ? `🚨 *HIGH RISK — Likely Scam* (${pct}% confidence)` :
    v === "SUSPICIOUS" ? `⚠️ *SUSPICIOUS* (${pct}% confidence)` :
    v === "MALICIOUS"  ? `🚨 *DANGEROUS URL* (${pct}% confidence)` :
                         `✅ *LOOKS SAFE* (${pct}% confidence)`;

  const lines = [header, ""];

  if (result.sender_check?.status === "known_fake") {
    const s = result.sender_check;
    lines.push(`• Sender *${s.sender}* is NOT registered to ${s.claimed_bank ?? "this bank"}`);
  }

  if (result.signals?.length > 0 && v !== "LEGITIMATE") {
    const labels = {
      urgency_pressure:   "Uses urgency or threat language",
      credential_harvest: "Asks for OTP, credentials or personal info",
      threat_language:    "Contains threatening language",
      fake_domain_hint:   "Contains a suspicious link",
      fake_sender_id:     "Sender ID is not genuine",
      lottery_prize_scam: "Claims you won a prize — classic scam",
      impersonation:      "Impersonates government or bank",
    };
    result.signals.slice(0, 3).forEach(s => {
      lines.push(`• ${labels[s] ?? s.replace(/_/g, " ")}`);
    });
  }

  if (result.explanation) {
    lines.push("", result.explanation.slice(0, 300));
  }

  if (v === "HIGH_FRAUD" || v === "MALICIOUS") {
    lines.push("", "🚨 *Already sent money? Call 1930 immediately.*");
  }

  lines.push("", "_Powered by FraudShield_");
  return lines.join("\n");
}

// ── Image-specific formatter ──────────────────────────────────
// Shows what text was extracted via OCR before the verdict
function formatImageVerdict(result) {
  const lines = [];

  // Show extracted text snippet if available
  if (result.ocr_text) {
    const preview = result.ocr_text.slice(0, 200).trim();
    lines.push(`📄 *Text extracted from image:*\n_"${preview}${result.ocr_text.length > 200 ? "…" : ""}"_`, "");
  }

  // Reuse the main verdict formatter for the rest
  lines.push(formatVerdict(result));

  return lines.join("\n");
}

function isUrlOnly(text) {
  return /^https?:\/\/\S+$/.test(text.trim()) || /^www\.\S+$/.test(text.trim());
}

function welcomeMessage() {
  return [
    "👋 *Welcome to FraudShield!*",
    "",
    "I help you detect scams before you lose money.",
    "",
    "*What I can check:*",
    "• 💬 Paste any suspicious SMS or WhatsApp message",
    "• 🔗 Send a suspicious link",
    "• 📸 Send a *screenshot* of a suspicious message",
    "",
    "I'll reply with a verdict in seconds.",
    "",
    "🔒 Your messages are never stored.",
    "🚨 National Fraud Helpline: *1930*",
  ].join("\n");
}

module.exports = { formatVerdict, formatImageVerdict, isUrlOnly, welcomeMessage };
