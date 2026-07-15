import { useState, useRef } from "react";
import LightPillar from "./components/LightPillar";
import TicketForm from "./components/TicketForm";
import BatchDemo from "./components/BatchDemo";
import ManualVsAIChallenge from "./components/ManualVsAIChallenge";
import "./App.css";
import AllTickets from "./components/AllTickets";

export default function App() {
  const [tab, setTab] = useState("classify");
  const mainRef = useRef(null);

  function goTo(nextTab) {
    setTab(nextTab);
    mainRef.current?.scrollIntoView({ behavior: "smooth" });
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
          <button className={tab === "classify" ? "active" : ""} onClick={() => goTo("classify")}>Classify</button>
          <button className={tab === "batch" ? "active" : ""} onClick={() => goTo("batch")}>Batch Demo</button>
          <button className={tab === "manual" ? "active" : ""} onClick={() => goTo("manual")}>You vs AI</button>
          <button className={tab === "tickets" ? "active" : ""} onClick={() => goTo("tickets")}>All Tickets</button>
        </div>
        <a className="nav-cta" href="https://github.com/Prakrit-Mohanty/Steam_ticket_router-Odyssey-Port4" target="_blank" rel="noopener noreferrer">View on GitHub</a>
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
          <button className="btn-solid" onClick={() => goTo("classify")}>Classify a Ticket</button>
          <button className="btn-glass" onClick={() => goTo("batch")}>Run Batch Demo</button>
        </div>
      </section>

      <main id="main-content" ref={mainRef}>
        {tab === "classify" && <TicketForm />}
        {tab === "batch" && <BatchDemo />}
        {tab === "manual" && <ManualVsAIChallenge />}
        {tab === "tickets" && <AllTickets />}
      </main>
    </div>
  );
}