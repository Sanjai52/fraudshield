/**
 * feedback.js
 * -----------
 * Accepts user verdict corrections.
 * Feeds the model learning loop — Week 6 wires the admin review queue.
 */

const express    = require("express");
const { supabase } = require("../middleware/auth");

const router = express.Router();

router.post("/", async (req, res) => {
  const { analysis_id, user_says_correct, user_label } = req.body;

  if (!analysis_id || user_says_correct === undefined) {
    return res.status(422).json({ error: "analysis_id and user_says_correct are required" });
  }

  try {
    const { error } = await supabase.from("feedback").insert({
      analysis_id,
      user_id:          req.user?.id ?? null,
      user_says_correct,
      user_label:       user_label ?? null,
    });

    if (error) throw error;

    return res.json({ queued: true, message: "Thank you — your feedback helps improve the model." });

  } catch (err) {
    console.error("[feedback]", err.message);
    return res.status(500).json({ error: "Failed to save feedback" });
  }
});

module.exports = router;