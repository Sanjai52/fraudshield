/**
 * analyse.js
 * ----------
 * Proxies analysis requests to the Python FastAPI backend.
 * Saves results to Supabase after each successful analysis.
 * PII is stripped by middleware before this route runs.
 */

const express = require("express");
const fetch   = require("node-fetch");
const { supabase } = require("../middleware/auth");
require("dotenv").config();

const router   = express.Router();
const AI_URL   = process.env.FASTAPI_URL ?? "http://localhost:8000";

async function saveAnalysis(result, inputType, userId) {
  try {
    await supabase.from("analyses").insert({
      user_id:           userId ?? null,
      input_type:        inputType,
      verdict:           result.verdict,
      display_verdict:   result.display_verdict,
      confidence:        result.confidence,
      fraud_probability: result.fraud_probability ?? null,
      signals:           result.signals ?? [],
      explanation:       result.explanation ?? null,
      action:            result.action ?? null,
      sender_status:     result.sender_check?.status ?? null,
      sender_id:         result.sender_check?.sender ?? null,
      url_verdict:       result.url_checks?.[0]?.verdict ?? result.verdict ?? null,
      model_version:     result.model_version ?? "v1",
      language:          result.language ?? "en",
    });
  } catch (err) {
    // Non-critical — don't fail the request if save fails
    console.error("[analyse] Failed to save to Supabase:", err.message);
  }
}

// POST /analyse/text
router.post("/text", async (req, res) => {
  try {
    const upstream = await fetch(`${AI_URL}/analyse/text`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message: req.body.message, lang: req.body.lang ?? "en" }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json(err);
    }

    const data = await upstream.json();
    await saveAnalysis(data, "text", req.user?.id);
    return res.json(data);

  } catch (err) {
    console.error("[analyse/text]", err.message);
    return res.status(502).json({ error: "AI service unavailable", detail: err.message });
  }
});

// POST /analyse/url
router.post("/url", async (req, res) => {
  try {
    const upstream = await fetch(`${AI_URL}/analyse/url`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ url: req.body.url }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json(err);
    }

    const data = await upstream.json();
    await saveAnalysis(data, "url", req.user?.id);
    return res.json(data);

  } catch (err) {
    console.error("[analyse/url]", err.message);
    return res.status(502).json({ error: "AI service unavailable", detail: err.message });
  }
});

module.exports = router;