import { useState } from "react";
import { draftReply } from "../api";

const LOW_CONFIDENCE_THRESHOLD = 0.5;

function confidenceColor(confidence) {
  if (confidence < LOW_CONFIDENCE_THRESHOLD) return "#ff6b6b";
  if (confidence < 0.75) return "#f0b429";
  return "#5ecbe0";
}

export default function ResultCard({ result }) {
  const [showJson, setShowJson] = useState(false);
  const [draftedReply, setDraftedReply] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState(null);

  if (!result) return null;
  const {
    text,
    ticket_number,
    category,
    priority,
    department,
    assigned_to,
    assigned_role,
    work_item_description,
    estimated_resolution,
    reasoning,
    confidence,
    meta,
  } = result;
  const isLowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD;

  async function handleDraftReply() {
    setDraftLoading(true);
    setDraftError(null);
    try {
      const data = await draftReply(text, category, priority);
      setDraftedReply(data.reply);
    } catch (err) {
      setDraftError(err.message);
    } finally {
      setDraftLoading(false);
    }
  }

  return (
    <div className="result-card">
      {ticket_number && (
        <div className="ticket-created-banner">
          ✅ Ticket <strong>{ticket_number}</strong> created —{" "}
          {assigned_to ? (
            <>assigned to <strong>{assigned_to}</strong> ({assigned_role})</>
          ) : (
            "waiting to be assigned"
          )}
        </div>
      )}

      {work_item_description && (
        <div className="reasoning" style={{ marginBottom: 12 }}>{work_item_description}</div>
      )}

      {estimated_resolution && (
        <p className="panel-sub" style={{ marginBottom: 12 }}>
          ⏱ Estimated resolution time: <strong>{estimated_resolution}</strong>
        </p>
      )}

      <div className="result-grid">
        <div className="result-field">
          <label>Category</label>
          <div className="value">{category}</div>
        </div>
        <div className="result-field">
          <label>Priority</label>
          <div className="value">
            <span className={`pill ${priority}`}>{priority}</span>
          </div>
        </div>
        <div className="result-field">
          <label>Department</label>
          <div className="value">{department || "—"}</div>
        </div>
      </div>

      <div className="reasoning">"{reasoning}"</div>

      <div className="confidence-row">
        <span className="confidence-label">Confidence</span>
        <div className="confidence-bar-track">
          <div
            className="confidence-bar-fill"
            style={{ width: `${Math.round(confidence * 100)}%`, background: confidenceColor(confidence) }}
          />
        </div>
        <span style={{ fontSize: 12, color: confidenceColor(confidence) }}>{Math.round(confidence * 100)}%</span>
      </div>

      {isLowConfidence && <div className="flag">⚠ Low confidence - flagged for human review</div>}

      {meta && (
        <div className="meta-row">
          <span>provider: {meta.provider}/{meta.model}</span>
          <span>time: {meta.processing_time_ms}ms</span>
          {meta.tool_calls_made > 0 && <span>🔎 checked {meta.tool_calls_made} similar ticket(s)</span>}
          {meta.retried && <span>⟳ needed 1 auto-repair retry</span>}
        </div>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn-glass" onClick={handleDraftReply} disabled={draftLoading}>
          {draftLoading ? "Drafting…" : "✍️ Draft a Reply"}
        </button>
      </div>

      {draftError && <div className="error-box">⚠ {draftError}</div>}

      {draftedReply && (
        <div className="draft-reply-box">
          <label className="detail-label">Suggested Reply (review before sending)</label>
          <p>{draftedReply}</p>
        </div>
      )}

      <button className="json-toggle" onClick={() => setShowJson((v) => !v)}>
        {showJson ? "Hide Raw JSON ▲" : "View Raw JSON ▼"}
      </button>
      {showJson && <pre className="json-view">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}