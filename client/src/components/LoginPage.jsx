import { useState } from "react";
import { login, register } from "../api";

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
  }

  return (
    <div className="app">
      <div className="panel" style={{ maxWidth: 400, margin: "120px auto" }}>
        <h2>Smart Ticket Router</h2>
        <p className="panel-sub">
          {mode === "login" ? "Sign in to continue" : "Create a new account"}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            className="ticket-input"
            style={{ minHeight: "auto", marginBottom: 12 }}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="ticket-input"
            style={{ minHeight: "auto", marginBottom: 12 }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="row">
            <button className="btn-solid" type="submit" disabled={loading || !username || !password}>
              {loading
                ? (mode === "login" ? "Signing in…" : "Creating account…")
                : (mode === "login" ? "Sign In" : "Create Account")}
            </button>
          </div>
        </form>
        {error && <div className="error-box">⚠ {error}</div>}

        <p className="panel-sub" style={{ marginTop: 16 }}>
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={toggleMode}
            style={{ background: "none", border: "none", color: "#5ecbe0", textDecoration: "underline", cursor: "pointer", padding: 0 }}
          >
            {mode === "login" ? "Register" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}