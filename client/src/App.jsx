import { useState } from "react";
import LightPillar from "./components/LightPillar";
import TicketForm from "./components/TicketForm";
import BatchDemo from "./components/BatchDemo";
import ManualVsAIChallenge from "./components/ManualVsAIChallenge";
import "./App.css";

export default function App() {
  const [history, setHistory] = useState([]);

  function recordResult(result) {
    if (result?.meta) {
      setHistory((prev) => [...prev, result.meta]);
    }
  }

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
          <a href="#classify" className="btn-solid">Classify a Ticket</a>
          <a href="#batch" className="btn-glass">Run Batch Demo</a>
        </div>
      </section>

      <main id="main-content">
        <div id="classify">
          <TicketForm onClassified={recordResult} />
        </div>
        <div id="batch">
          <BatchDemo onClassified={recordResult} />
        </div>
        <ManualVsAIChallenge />
      </main>
    </div>
  );
}