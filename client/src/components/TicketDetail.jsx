import { useEffect, useState } from "react";
import { getTicket } from "../api";

export default function TicketDetail({ ticketId, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTicket(ticketId)
      .then((data) => { if (!cancelled) setTicket(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticketId]);

  return (
    <div className="panel">
      <button className="btn-glass" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to All Tickets
      </button>

      {loading && <p className="panel-sub">Loading ticket…</p>}
      {error && <p style={{ color: "var(--high)" }}>⚠ {error}</p>}

      {ticket && (
        <>
          <div className="panel-title">
            <h2>{ticket.ticket_number}</h2>
            <span className={`pill ${ticket.priority}`}>{ticket.priority}</span>
          </div>
          <p style={{ fontSize: "1.1rem", marginTop: 8 }}>{ticket.work_item_description}</p>
          <p className="panel-sub" style={{ marginTop: 4 }}>Original message: "{ticket.text}"</p>

          <div className="ticket-detail-grid">
            <div className="detail-field">
              <span className="detail-label">Est. Resolution Time</span>
              <span className="detail-value">{ticket.estimated_resolution}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Department</span>
              <span className="detail-value">{ticket.department || "—"}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Assigned To</span>
              <span className="detail-value">
                {ticket.assigned_to ? `${ticket.assigned_to} (${ticket.assigned_role})` : "—"}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Confidence</span>
              <span className="detail-value">{Math.round(ticket.confidence * 100)}%</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Last Updated</span>
              <span className="detail-value">{new Date(ticket.updated_at).toLocaleString()}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Updated By</span>
              <span className="detail-value">{ticket.updated_by}</span>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <span className="detail-label">Reasoning</span>
            <p className="panel-sub">{ticket.reasoning}</p>
          </div>
        </>
      )}
    </div>
  );
}