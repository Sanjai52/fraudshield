import type { AnalysisResult } from "./types";
import { createClient } from "./supabase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function post<T>(path: string, body: object): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body:   JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? err?.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const analyseText = (text: string): Promise<AnalysisResult> =>
  post("/analyse/text", { message: text });

export const analyseUrl = (url: string): Promise<AnalysisResult> =>
  post("/analyse/url", { url });

export const submitFeedback = (
  analysis_id: string,
  correct: boolean,
  notes?: string
): Promise<void> =>
  post("/feedback", { analysis_id, correct, notes });
// ```

// ---

// ## Week 6 Checklist
// ```
// [ ] URL heuristics added — sbi-kyc.net returns SUSPICIOUS without API
// [ ] PHISHTANK_KEY added to .env
// [ ] /dashboard shows logged-in user's analysis history
// [ ] Feedback buttons appear on /result page
// [ ] /transparency shows live stats from Supabase
// [ ] Logged-in user's analyses appear in dashboard after checking a message
// [ ] api.ts sends auth token — analyses linked to user in DB