import type { AnalysisResult } from "./types";

// FastAPI AI engine
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? err?.message ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

// FastAPI expects { message } for text, { url } for URL
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
