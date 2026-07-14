import { useState } from "react";
import { classifyOne } from "../api";
import { sampleTickets } from "../data/sampleTickets";

export default function BatchDemo({ onClassified }) {
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState([]);
  const [progress, setProgress] = useState(0);

  async function runAll() {
    setRunning(true);
    setRows([]);
    setProgress(0);

    for (let i = 0; i < sampleTickets.length; i++) {
      const ticket = sampleTickets[i];
      try {
        const result = await classifyOne(ticket.text);
        onClassified?.(result);
        setRows((prev) => [...prev, { ticket, result, error: null }]);
      } catch (err) {
        setRows((prev) => [...prev, { ticket, result: null, error: err.message }]);
      }
      setProgress(Math.round(((i + 1) / sampleTickets.length) * 100));
    }
    setRunning(false);
  }

  return (
    <div className="panel">
      <h2>Batch Demo — 20 Sample Tickets</h2>
      <p className="panel-sub">
        Runs all 20 tickets (angry, vague, ambiguous, and wrong-language edge cases included)
        through the live classifier, one at a time.
      </p>
      <div className="row">
        <button className="btn-solid" onClick={runAll} disabled={running}>
          {running ? `Running… ${progress}%` : "Run All 20 Tickets"}
        </button>
      </div>
      {running && (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
      {rows.length > 0 && (
        <div className="batch-table-wrap">
          <table className="batch-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Ticket</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Team</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ ticket, result, error }) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>
                    {ticket.text}
                    {ticket.tag && <span className="tag-chip">{ticket.tag}</span>}
                  </td>
                  {error ? (
                    <td colSpan={4} style={{ color: "#ff6b6b" }}>⚠ {error}</td>
                  ) : (
                    <>
                      <td>{result.category}</td>
                      <td><span className={`pill ${result.priority}`}>{result.priority}</span></td>
                      <td>{result.assigned_team}</td>
                      <td>{Math.round(result.confidence * 100)}%</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}