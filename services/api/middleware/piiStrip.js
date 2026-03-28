/**
 * piiStrip.js
 * -----------
 * Strips PII from message text before it reaches the Python AI backend.
 * Raw message content is NEVER stored or forwarded with personal data.
 *
 * Strips:
 *   - Indian mobile numbers (10 digits starting 6-9)
 *   - Account numbers (XX1234 pattern)
 *   - Card numbers (16 digits)
 *   - PAN card (ABCDE1234F format)
 *   - Aadhaar (12 digits)
 *   - Email addresses
 *   - UPI IDs
 */

function stripPII(text) {
  if (!text || typeof text !== "string") return text;

  return text
    .replace(/\b[6-9]\d{9}\b/g,              "[PHONE]")
    .replace(/\b\d{10}\b/g,                  "[PHONE]")
    .replace(/XX\d{4}/gi,                    "XX[ACCT]")
    .replace(/\b\d{16}\b/g,                  "[CARD]")
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g,     "[PAN]")
    .replace(/\b\d{12}\b/g,                  "[AADHAAR]")
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
    .replace(/[a-zA-Z0-9.\-]+@[a-zA-Z]{2,}/g, "[UPI]")
    .trim();
}

function piiStripMiddleware(req, res, next) {
  if (req.body) {
    if (req.body.message) {
      req.body.message = stripPII(req.body.message);
    }
    if (req.body.text) {
      req.body.text = stripPII(req.body.text);
    }
  }
  next();
}

module.exports = { piiStripMiddleware, stripPII };