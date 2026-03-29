const express      = require("express");
const { supabase } = require("../middleware/auth");

const router = express.Router();

router.post("/", async (req, res) => {
  const { analysis_id, user_says_correct, user_label } = req.body;

  if (user_says_correct === undefined || user_says_correct === null) {
    return res.status(422).json({ error: "user_says_correct is required" });
  }

  try {
    const { error } = await supabase.from("feedback").insert({
      analysis_id:       analysis_id ?? null,   // null is valid — anonymous feedback
      user_id:           req.user?.id ?? null,
      user_says_correct: Boolean(user_says_correct),
      user_label:        user_label ?? null,
    });

    if (error) throw error;

    return res.json({
      queued:  true,
      message: "Thank you — your feedback helps improve the model.",
    });
  } catch (err) {
    console.error("[feedback]", err.message);
    return res.status(500).json({ error: "Failed to save feedback" });
  }
});

module.exports = router;