import { useState } from "react";
import { classifyOne } from "../api";
import ResultCard from "./ResultCard";

export default function TicketForm({ onClassified }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await classifyOne(text);
      setResult(data);
      onClassified?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2>Classify a Ticket</h2>
      <p className="panel-sub">Paste any support message and see how the AI routes it.</p>
      <form onSubmit={submit}>
        <textarea
          className="ticket-input"
          placeholder="e.g. 'The game crashed and I lost all my progress!'"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row">
          <button className="btn-solid" type="submit" disabled={loading || !text.trim()}>
            {loading ? "Classifying…" : "Classify Ticket"}
          </button>
        </div>
      </form>
      {error && <div className="error-box">⚠ {error}</div>}
      <ResultCard result={result} />
    </div>
  );
}