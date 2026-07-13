import LiquidEther from "./components/LiquidEther";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <div className="liquid-bg-wrapper">
        <LiquidEther
  colors={["#5227FF", "#FF9FFC", "#B497CF"]}
  mouseForce={20}
  cursorSize={110}
  isViscous={false}
  resolution={0.5}
  autoDemo
  autoSpeed={0.4}
  autoIntensity={1.8}
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