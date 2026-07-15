import { useEffect, useState } from "react";
import { listTickets } from "../api";
import TicketDetail from "./TicketDetail";

export default function AllTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    setError(null);
    try {
      const data = await listTickets();
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (selectedId) {
    return <TicketDetail ticketId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <h2>All Tickets</h2>
        <button className="btn-glass" onClick={loadTickets} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="panel-sub">Every ticket submitted through this system, pulled live from the database.</p>

      {error && <p style={{ color: "var(--high)" }}>⚠ {error}</p>}

      {!loading && tickets.length === 0 && !error && (
        <p className="panel-sub">No tickets yet. Classify one to see it show up here.</p>
      )}

      {tickets.length > 0 && (
        <div className="batch-table-wrap">
          <table className="batch-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Description</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Department</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Est. Resolution</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} onClick={() => setSelectedId(t.id)} style={{ cursor: "pointer" }}>
                  <td>{t.ticket_number}</td>
                  <td>{t.work_item_description}</td>
                  <td>{t.category}</td>
                  <td><span className={`pill ${t.priority}`}>{t.priority}</span></td>
                  <td>{t.department || "—"}</td>
                  <td>{t.assigned_to ? `${t.assigned_to} (${t.assigned_role})` : "—"}</td>
                  <td>{new Date(t.created_at).toLocaleString()}</td>
                  <td>{t.estimated_resolution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}