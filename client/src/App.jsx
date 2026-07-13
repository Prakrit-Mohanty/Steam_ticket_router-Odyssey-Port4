import LightPillar from "./components/LightPillar";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <div className="liquid-bg-wrapper">
        <LightPillar
          topColor="#5227FF"
          bottomColor="#FF9FFC"
          intensity={1}
          rotationSpeed={0.3}
          glowAmount={0.002}
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={0.5}
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality="high"
        />
      </div>

      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-badge">TR</span>
          Smart Ticket Router
        </div>
        <div className="nav-links">
          <a href="#classify">Classify</a>
          <a href="#batch">Batch Demo</a>
        </div>
        <button className="nav-cta">View on GitHub</button>
      </nav>

      <section className="hero">
        <div className="hero-pill">
          <span className="badge-new">NEW</span>
          Port·04 — The Senate of Gods
        </div>
        <h1>AI-powered ticket triage for your game platform.</h1>
        <p className="hero-sub">
          Classify, prioritize, and route support tickets in seconds, not minutes —
          built for a Steam-style platform, powered by an LLM agent.
        </p>
        <div className="hero-actions">
          <button className="btn-solid">Classify a Ticket</button>
          <button className="btn-glass">Run Batch Demo</button>
        </div>
      </section>
    </div>
  );
}