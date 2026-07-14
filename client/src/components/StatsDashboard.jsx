import { useState } from "react";

export default function StatsDashboard({ history }) {
  const [manualMinutes, setManualMinutes] = useState(4);

  const count = history.length;
  const totalAiMs = history.reduce((sum, h) => sum + (h.processing_time_ms || 0), 0);
  const avgAiMs = count ? Math.round(totalAiMs / count) : 0;
  const totalManualMs = count * manualMinutes * 60 * 1000;
  const savedMs = Math.max(totalManualMs - totalAiMs, 0);
  const savedPct = totalManualMs ? Math.round((savedMs / totalManualMs) * 100) : 0;

  function fmt(ms) {
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    const rem = Math.round(s % 60);
    return `${m}m ${rem}s`;
  }

  return (
    <div className="panel">
      <h2>Before / After: Manual vs AI Routing</h2>
      <p className="panel-sub">
        A support agent manually reading, categorizing, and routing a ticket takes a few minutes.
        Set your own estimate and compare it live against what this tool actually measured.
      </p>
      <div className="manual-time-input">
        <span>Assumed manual time per ticket:</span>
        <input
          type="number"
          min={1}
          max={30}
          value={manualMinutes}
          onChange={(e) => setManualMinutes(Number(e.target.value) || 1)}
        />
        <span>minutes</span>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="num">{count}</div>
          <div className="label">Tickets Classified</div>
        </div>
        <div className="stat-card">
          <div className="num">{fmt(avgAiMs)}</div>
          <div className="label">Avg AI Time / Ticket</div>
        </div>
        <div className="stat-card">
          <div className="num">{fmt(totalManualMs)}</div>
          <div className="label">Estimated Manual Time</div>
        </div>
        <div className="stat-card">
          <div className="num" style={{ color: "#5ecbe0" }}>{count ? `${savedPct}%` : "—"}</div>
          <div className="label">Time Saved</div>
        </div>
      </div>
      {count === 0 && (
        <p className="panel-sub" style={{ marginTop: 14 }}>
          Classify a ticket (or run the batch demo) to populate these numbers.
        </p>
      )}
    </div>
  );
}