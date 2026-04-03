import type { AnalysisResult } from "./types";
import { createClient } from "./supabase";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

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

export async function analyseImage(file: File): Promise<any> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/analyse/image`, {
    method: "POST",
    body:   formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function analyseVoice(file: File): Promise<any> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/analyse/voice`, {
    method: "POST",
    body:   formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? `Upload failed: ${res.status}`);
  }
  return res.json();
}