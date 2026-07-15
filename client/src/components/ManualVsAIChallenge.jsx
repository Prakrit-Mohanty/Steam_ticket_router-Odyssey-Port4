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
const GUARDRAIL_SNIPPET = "doesn't look like a real support message";

// Mirrors server/app/teams.py - the LLM only ever picks a category,
// team assignment is a fixed lookup, never left to the model.
const TEAM_MAP = {
  "Billing & Refunds": "Payments Team",
  "Account & Login": "Account Security Team",
  "Game Library & Downloads": "Platform Engineering",
  "Technical Performance": "Technical Support",
  "Community & Moderation": "Trust & Safety",
  "Feature Request": "Product Team",
  "General Inquiry": "Customer Success",
};

// Mirrors server/app/routing.py
const PRIORITY_TO_ROLE = { High: "Manager", Medium: "Senior", Low: "Junior" };

// Mirrors server/app/seed.py
const ROSTER = {
  "Payments Team": { Manager: "Rachel Kim", Senior: "Diego Torres", Junior: "Amy Chen" },
  "Account Security Team": { Manager: "Marcus Webb", Senior: "Priya Nair", Junior: "Jordan Lee" },
  "Platform Engineering": { Manager: "Elena Rossi", Senior: "Sam Okafor", Junior: "Taylor Wu" },
  "Technical Support": { Manager: "Grace Park", Senior: "Liam O'Brien", Junior: "Noah Ahmed" },
  "Trust & Safety": { Manager: "Olivia Bennett", Senior: "Carlos Ruiz", Junior: "Mia Johnson" },
  "Product Team": { Manager: "Ethan Brooks", Senior: "Sofia Martins", Junior: "Ben Carter" },
  "Customer Success": { Manager: "Ava Thompson", Senior: "Ryan Patel", Junior: "Zoe Davis" },
};

const TEAMS = Object.keys(ROSTER);

function peopleForTeam(team) {
  return team ? Object.entries(ROSTER[team] || {}) : []; // [[role, name], ...]
}

function resolveAssignment(category, priority) {
  const team = TEAM_MAP[category];
  const role = PRIORITY_TO_ROLE[priority];
  const person = team ? ROSTER[team]?.[role] : null;
  return { team, role, person };
}

export default function ManualVsAIChallenge() {
  const [phase, setPhase] = useState("idle"); // idle | manual | ai | done
  const [index, setIndex] = useState(0);
  const [manualAnswers, setManualAnswers] = useState([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState(PRIORITIES[0]);
  const [team, setTeam] = useState(TEAMS[0]);
  const [person, setPerson] = useState(peopleForTeam(TEAMS[0])[0]?.[1] || "");
  const [flagged, setFlagged] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [aiProgress, setAiProgress] = useState(0);
  const ticketStartRef = useRef(null);

  function resetPicks() {
    setCategory(CATEGORIES[0]);
    setPriority(PRIORITIES[0]);
    setTeam(TEAMS[0]);
    setPerson(peopleForTeam(TEAMS[0])[0]?.[1] || "");
    setFlagged(false);
  }

  function handleTeamChange(newTeam) {
    setTeam(newTeam);
    const first = peopleForTeam(newTeam)[0];
    setPerson(first ? first[1] : "");
  }

  function start() {
    setPhase("manual");
    setIndex(0);
    setManualAnswers([]);
    resetPicks();
    ticketStartRef.current = performance.now();
  }

  function submitTicket() {
    const now = performance.now();
    const ticket = sampleTickets[index];
    const timeMs = Math.round(now - ticketStartRef.current);
    const role = Object.entries(ROSTER[team] || {}).find(([, name]) => name === person)?.[0];

    setManualAnswers((prev) => [
      ...prev,
      flagged
        ? { id: ticket.id, text: ticket.text, flagged: true, timeMs }
        : { id: ticket.id, text: ticket.text, category, priority, team, person, role, flagged: false, timeMs },
    ]);
    resetPicks();

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
        const assignment = resolveAssignment(result.category, result.priority);
        setAiResults((prev) => [...prev, {
          id: ticket.id, text: ticket.text, category: result.category,
          priority: result.priority, ...assignment,
          timeMs: result.meta.processing_time_ms, flagged: false,
        }]);
      } catch (err) {
        const isGuardrail = err.message.includes(GUARDRAIL_SNIPPET);
        setAiResults((prev) => [...prev, {
          id: ticket.id, text: ticket.text,
          flagged: isGuardrail,
          error: isGuardrail ? null : err.message,
        }]);
      }
      setAiProgress(Math.round(((i + 1) / sampleTickets.length) * 100));
    }
    setPhase("done");
  }

  const totalManualMs = manualAnswers.reduce((s, a) => s + a.timeMs, 0);
  const totalAiMs = aiResults.reduce((s, a) => s + (a.timeMs || 0), 0);
  const agreementCount = manualAnswers.filter((m) => {
    const ai = aiResults.find((a) => a.id === m.id);
    if (!ai) return false;
    if (m.flagged && ai.flagged) return true;
    if (!m.flagged && !ai.flagged && !ai.error) return ai.category === m.category;
    return false;
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
        Manually categorize, prioritize, and route all 20 tickets yourself - team and assignee
        included, timed. Then the AI classifies the exact same 20, and we compare real numbers.
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

          <label className="flag-checkbox">
            <input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} />
            🚩 This doesn't look like a real support message
          </label>

          {!flagged && (
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
              <div>
                <label>Team</label>
                <select value={team} onChange={(e) => handleTeamChange(e.target.value)}>
                  {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>Assigned To</label>
                <select value={person} onChange={(e) => setPerson(e.target.value)}>
                  {peopleForTeam(team).map(([role, name]) => (
                    <option key={name} value={name}>{name} ({role})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
                  <th>Your Answer</th>
                  <th>Your Routing</th>
                  <th>AI Answer</th>
                  <th>AI Routing</th>
                  <th>Match</th>
                  <th>Your Time</th>
                  <th>AI Time</th>
                </tr>
              </thead>
              <tbody>
                {manualAnswers.map((m) => {
                  const ai = aiResults.find((a) => a.id === m.id);
                  const match = ai && ((m.flagged && ai.flagged) || (!m.flagged && !ai.flagged && !ai.error && ai.category === m.category));
                  return (
                    <tr key={m.id}>
                      <td>{m.text}</td>
                      <td>{m.flagged ? "🚩 Not a real message" : `${m.category} / ${m.priority}`}</td>
                      <td>{m.flagged ? "—" : `${m.team} → ${m.person} (${m.role})`}</td>
                      <td>
                        {ai?.error ? "⚠ error" : ai?.flagged ? "🚩 Not a real message" : `${ai?.category} / ${ai?.priority}`}
                      </td>
                      <td>{ai?.error || ai?.flagged ? "—" : `${ai?.team} → ${ai?.person} (${ai?.role})`}</td>
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