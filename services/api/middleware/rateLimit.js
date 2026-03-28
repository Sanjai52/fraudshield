/**
 * rateLimit.js
 * ------------
 * Rate limiting middleware.
 *
 * Guest (no auth token):      20 checks per day per IP
 * Authenticated (with token): 20 checks per day per user ID
 *
 * The two limiters use completely separate stores and keys
 * so a guest and a logged-in user never share counters.
 */

const rateLimit = require("express-rate-limit");

// ── Guest limiter ─────────────────────────────────────────────
// Only applies when req.user is null (no valid auth token)
const guestLimiter = rateLimit({
  windowMs:        24 * 60 * 60 * 1000,   // 24 hours
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => `guest:${req.ip}`,
  skip:            (req) => !!req.user,    // logged-in users bypass this entirely
  handler:         (req, res) => {
    res.status(429).json({
      error:        "Daily limit reached",
      detail:       "You have used your 20 free checks for today. Create a free account for a fresh 20 checks per day.",
      sign_up_url:  "/signup",
      resets_in:    "Resets at midnight",
    });
  },
});

// ── Auth limiter ──────────────────────────────────────────────
// Only applies when req.user exists (valid JWT verified by auth middleware)
const authLimiter = rateLimit({
  windowMs:        24 * 60 * 60 * 1000,   // 24 hours
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => `user:${req.user?.id ?? req.ip}`,
  skip:            (req) => !req.user,     // guests bypass this entirely
  handler:         (req, res) => {
    res.status(429).json({
      error:    "Daily limit reached",
      detail:   "You have used your 20 checks for today. Your limit resets at midnight.",
    });
  },
});

module.exports = { guestLimiter, authLimiter };