"use client";
import { useState } from "react";
import { storeFeedback } from "@/lib/db";

interface Props {
  analysisId: string;
  userId:     string | null;
}

export default function FeedbackForm({ analysisId, userId }: Props) {
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [label,   setLabel]   = useState("");

  async function submit(correct: boolean) {
    setLoading(true);
    const ok = await storeFeedback(analysisId, userId, correct, label || undefined);
    if (ok) setSent(true);
    setLoading(false);
  }

  if (sent) return (
    <div className="card feedback-thanks">
      ✅ Thank you — your feedback helps improve the model.
    </div>
  );

  return (
    <div className="card feedback-card">
      <div className="section-label" style={{ marginBottom: 12 }}>Was this verdict correct?</div>
      <div className="feedback-btn-row">
        <button onClick={() => submit(true)} disabled={loading} className="btn-outline feedback-btn">
          👍 Yes, correct
        </button>
        <button
          onClick={() => submit(false)}
          disabled={loading}
          className="feedback-btn feedback-btn-wrong"
        >
          👎 No, wrong verdict
        </button>
      </div>
      <input
        type="text"
        placeholder="Optional: tell us what the correct verdict should be"
        value={label}
        onChange={e => setLabel(e.target.value)}
        style={{ marginTop: 12 }}
      />
    </div>
  );
}