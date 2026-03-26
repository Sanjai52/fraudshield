import type { AnalysisResult } from "./types";

// Point this at your Node.js backend
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export const analyseText = (text: string): Promise<AnalysisResult> =>
  post("/analyse/text", { text });

export const analyseUrl = (url: string): Promise<AnalysisResult> =>
  post("/analyse/url", { url });

export const submitFeedback = (
  analysis_id: string,
  correct: boolean,
  notes?: string
): Promise<void> =>
  post("/feedback", { analysis_id, correct, notes });