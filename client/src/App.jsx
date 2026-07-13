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

      <div className="content">
        <div className="header">
          <div className="badge">TR</div>
          <div>
            <h1>Smart Ticket Router</h1>
          </div>
        </div>
        <p className="subtitle">Port·04 — The Senate of Gods — The Translator</p>
      </div>
    </div>
  );
}