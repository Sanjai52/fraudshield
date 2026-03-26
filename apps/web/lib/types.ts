export type Verdict = "SAFE" | "SUSPICIOUS" | "DANGEROUS";

export interface AnalysisResult {
  verdict: Verdict;
  confidence: number;          // 0–1
  explanation: string;
  flags: string[];             // e.g. ["Urgency language", "Fake sender ID"]
  advice: string;
  reported_count?: number;     // how many users reported this pattern
  analysis_id?: string;        // for sharing / history
}

export interface AnalyseTextRequest {
  text: string;
}

export interface AnalyseUrlRequest {
  url: string;
}