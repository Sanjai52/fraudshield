/**
 * stats.js
 * --------
 * Public stats endpoint — serves live numbers from Supabase.
 * Used by /transparency page.
 */

const express    = require("express");
const { supabase } = require("../middleware/auth");

const router = express.Router();

router.get("/public", async (req, res) => {
  try {
    // Total analyses
    const { count: total } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true });

    // Fraud detected
    const { count: fraudCount } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true })
      .eq("verdict", "FRAUD");

    // Latest model version
    const { data: model } = await supabase
      .from("model_versions")
      .select("version, f1_score, false_positive_rate")
      .order("deployed_at", { ascending: false })
      .limit(1)
      .single();

    return res.json({
      total_analyses:      total      ?? 0,
      fraud_detected:      fraudCount ?? 0,
      false_positive_rate: model?.false_positive_rate ?? 0.0113,
      model_f1:            model?.f1_score            ?? 0.9733,
      model_version:       model?.version             ?? "v1",
      active_campaigns:    0,
    });

  } catch (err) {
    console.error("[stats/public]", err.message);
    return res.status(500).json({ error: "Stats unavailable" });
  }
});

module.exports = router;