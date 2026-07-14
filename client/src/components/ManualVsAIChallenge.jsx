import { useState, useRef } from "react";
import { classifyOne } from "../api";
import { sampleTickets } from "../data/sampleTickets";

const CATEGORIES = [
  "Billing & Refunds",
  "Account & Login",
  "Game Library & Downloads",
  "Technical Performance",
  "Community & Moderation",
  "Feature Request",
  "General Inquiry",
];
const PRIORITIES = ["High", "Medium", "Low"];

export default function ManualVsAIChallenge() {
  const [phase, setPhase] = useState("idle"); // idle | manual | ai | done
  const [index, setIndex] = useState(0);
  const [manualAnswers, setManualAnswers] = useState([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState(PRIORITIES[0]);
  const [aiResults, setAiResults] = useState([]);
  const [aiProgress, setAiProgress] = useState(0);
  const ticketStartRef = useRef(null);

  function start() {
    setPhase("manual");
    setIndex(0);
    setManualAnswers([]);
    setCategory(CATEGORIES[0]);
    setPriority(PRIORITIES[0]);
    ticketStartRef.current = performance.now();
  }

  function submitTicket() {
    const now = performance.now();
    const ticket = sampleTickets[index];
    const timeMs = Math.round(now - ticketStartRef.current);
    setManualAnswers((prev) => [...prev, { id: ticket.id, text: ticket.text, category, priority, timeMs }]);
    setCategory(CATEGORIES[0]);
    setPriority(PRIORITIES[0]);

    if (index + 1 >= sampleTickets.length) {
      runAiPass();
    } else {
      setIndex(index + 1);
      ticketStartRef.current = performance.now();
    }
  }

  async function runAiPass() {
    setPhase("ai");
    setAiResults([]);
    setAiProgress(0);
    for (let i = 0; i < sampleTickets.length; i++) {
      const ticket = sampleTickets[i];
      try {
        const result = await classifyOne(ticket.text);
        setAiResults((prev) => [...prev, {
          id: ticket.id, text: ticket.text, category: result.category,
          priority: result.priority, timeMs: result.meta.processing_time_ms,
        }]);
      } catch (err) {
        setAiResults((prev) => [...prev, { id: ticket.id, text: ticket.text, error: err.message }]);
      }
      setAiProgress(Math.round(((i + 1) / sampleTickets.length) * 100));
    }
    setPhase("done");
  }

  const totalManualMs = manualAnswers.reduce((s, a) => s + a.timeMs, 0);
  const totalAiMs = aiResults.reduce((s, a) => s + (a.timeMs || 0), 0);
  const agreementCount = manualAnswers.filter((m) => {
    const ai = aiResults.find((a) => a.id === m.id);
    return ai && ai.category === m.category;
  }).length;
  const maxMs = Math.max(totalManualMs, totalAiMs, 1);

  function fmt(ms) {
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${Math.round(s % 60)}s`;
  }

  return (
    <div className="panel">
      <h2>You vs AI: Sort the Same 20 Tickets</h2>
      <p className="panel-sub">
        Manually categorize and prioritize all 20 tickets yourself, timed. Then the AI classifies
        the exact same 20, and we compare real numbers - not a guess.
      </p>

      {phase === "idle" && (
        <div className="row">
          <button className="btn-solid" onClick={start}>Start Manual Sort Challenge</button>
        </div>
      )}

      {phase === "manual" && (
        <div className="manual-challenge">
          <div className="manual-progress">Ticket {index + 1} of {sampleTickets.length}</div>
          <div className="manual-ticket-text">"{sampleTickets[index].text}"</div>
          <div className="manual-controls">
            <div>
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-solid" onClick={submitTicket}>
            {index + 1 === sampleTickets.length ? "Submit Final Ticket" : "Submit & Next"}
          </button>
        </div>
      )}

      {phase === "ai" && (
        <div>
          <p className="panel-sub">Now running the AI on the same 20 tickets…</p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${aiProgress}%` }} />
          </div>
        </div>
      )}

      {phase === "done" && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="num">{fmt(totalManualMs)}</div>
              <div className="label">Your Total Time</div>
            </div>
            <div className="stat-card">
              <div className="num">{fmt(totalAiMs)}</div>
              <div className="label">AI Total Time</div>
            </div>
            <div className="stat-card">
              <div className="num" style={{ color: "#5ecbe0" }}>
                {totalManualMs ? Math.round((1 - totalAiMs / totalManualMs) * 100) : 0}%
              </div>
              <div className="label">Time Saved by AI</div>
            </div>
            <div className="stat-card">
              <div className="num">{agreementCount}/{sampleTickets.length}</div>
              <div className="label">You &amp; AI Agreed</div>
            </div>
          </div>

          <div className="compare-bars">
            <div className="compare-bar-row">
              <span className="compare-bar-label">You</span>
              <div className="compare-bar-track">
                <div className="compare-bar-fill you" style={{ width: `${(totalManualMs / maxMs) * 100}%` }} />
              </div>
              <span className="compare-bar-value">{fmt(totalManualMs)}</span>
            </div>
            <div className="compare-bar-row">
              <span className="compare-bar-label">AI</span>
              <div className="compare-bar-track">
                <div className="compare-bar-fill ai" style={{ width: `${(totalAiMs / maxMs) * 100}%` }} />
              </div>
              <span className="compare-bar-value">{fmt(totalAiMs)}</span>
            </div>
          </div>

          <div className="batch-table-wrap">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Your Category</th>
                  <th>AI Category</th>
                  <th>Match</th>
                  <th>Your Time</th>
                  <th>AI Time</th>
                </tr>
              </thead>
              <tbody>
                {manualAnswers.map((m) => {
                  const ai = aiResults.find((a) => a.id === m.id);
                  const match = ai && !ai.error && ai.category === m.category;
                  return (
                    <tr key={m.id}>
                      <td>{m.text}</td>
                      <td>{m.category}</td>
                      <td>{ai?.error ? "⚠ error" : ai?.category}</td>
                      <td>{ai?.error ? "—" : match ? "✅" : "❌"}</td>
                      <td>{fmt(m.timeMs)}</td>
                      <td>{ai?.timeMs ? fmt(ai.timeMs) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn-glass" onClick={start}>Run Again</button>
          </div>
        </div>
      )}
    </div>
  );
}