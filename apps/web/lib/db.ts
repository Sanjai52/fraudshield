import { createClient } from "./supabase";

// ── Store analysis result to Supabase ─────────────────────────
// Called from result page after each successful analysis.
// Raw message text is NEVER passed here — only derived features.
export async function storeAnalysis(result: any, inputType: string, userId: string | null) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      user_id:          userId,
      input_type:       inputType,
      verdict:          result.verdict === "FRAUD" ? "FRAUD" : result.verdict === "ERROR" ? "ERROR" : "LEGITIMATE",
      display_verdict:  result.display_verdict,
      confidence:       result.confidence ?? 0,
      fraud_probability: result.fraud_probability ?? 0,
      signals:          result.signals ?? [],
      explanation:      result.explanation ?? "",
      action:           result.action ?? "",
      sender_status:    result.sender_check?.status ?? null,
      sender_id:        result.sender_check?.sender ?? null,
      url_verdict:      result.url_checks?.[0]?.verdict ?? null,
      model_version:    result.model_version ?? "v1",
      language:         result.language ?? "en",
    })
    .select("id")
    .single();

  if (error) {
    console.error("storeAnalysis error:", error.message);
    return null;
  }

  // Increment campaign counter if same pattern seen before
  if (result.signals?.length > 0) {
    await incrementCampaign(result.signals, data.id);
  }

  return data.id as string;
}

// ── Submit feedback ────────────────────────────────────────────
export async function storeFeedback(
  analysisId: string,
  userId: string | null,
  correct: boolean,
  userLabel?: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("feedback")
    .insert({
      analysis_id:       analysisId,
      user_id:           userId,
      user_says_correct: correct,
      user_label:        userLabel ?? null,
    });
  if (error) console.error("storeFeedback error:", error.message);
  return !error;
}

// ── Campaign fingerprinting ────────────────────────────────────
// Groups repeated fraud patterns. Uses a hash of sorted signals as fingerprint.
async function incrementCampaign(signals: string[], analysisId: string) {
  const supabase = createClient();
  const sorted   = [...signals].sort().join("|");
  // Simple deterministic hash
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) - hash) + sorted.charCodeAt(i);
    hash |= 0;
  }
  const fingerprint = `fp_${Math.abs(hash).toString(16)}`;

  // Upsert — if same fingerprint exists, bump count + last_seen
  const { error } = await supabase
    .from("campaigns")
    .upsert(
      {
        fingerprint_hash: fingerprint,
        last_seen:        new Date().toISOString(),
        report_count:     1,
        pattern_tags:     signals,
      },
      {
        onConflict:        "fingerprint_hash",
        ignoreDuplicates:  false,
      }
    );

  if (error) {
    // If upsert doesn't merge count, do a manual increment
    await supabase.rpc("increment_campaign", { fp: fingerprint });
  }
}

// ── Get user's analyses ────────────────────────────────────────
export async function getUserAnalyses(userId: string, limit = 50) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getUserAnalyses error:", error.message);
    return [];
  }
  return data ?? [];
}

// ── Get single analysis ────────────────────────────────────────
export async function getAnalysis(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

// ── Get campaign count for a set of signals ────────────────────
export async function getCampaignCount(signals: string[]): Promise<number> {
  if (!signals?.length) return 0;
  const supabase  = createClient();
  const sorted    = [...signals].sort().join("|");
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) - hash) + sorted.charCodeAt(i);
    hash |= 0;
  }
  const fingerprint = `fp_${Math.abs(hash).toString(16)}`;
  const { data } = await supabase
    .from("campaigns")
    .select("report_count")
    .eq("fingerprint_hash", fingerprint)
    .single();
  return data?.report_count ?? 0;
}

// ── Dashboard stats ────────────────────────────────────────────
export async function getUserStats(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("analyses")
    .select("verdict, created_at")
    .eq("user_id", userId);

  const rows = data ?? [];
  const total   = rows.length;
  const fraud   = rows.filter(r => r.verdict === "FRAUD").length;
  const safe    = rows.filter(r => r.verdict === "LEGITIMATE").length;
  // Analyses this month
  const thisMonth = rows.filter(r => {
    const d = new Date(r.created_at);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  return { total, fraud, safe, thisMonth };
}