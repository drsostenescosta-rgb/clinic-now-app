import React, { useState } from "react";
import Emily from "./tabs/Emily.jsx";
import Agenda from "./tabs/Agenda.jsx";
import Pacientes from "./tabs/Pacientes.jsx";
import Mais from "./tabs/Mais.jsx";

const TABS = [
  { id: "emily", label: "Emily", icon: "💬" },
  { id: "agenda", label: "Agenda", icon: "📅" },
  { id: "pacientes", label: "Pacientes", icon: "🧑‍⚕️" },
  { id: "mais", label: "Mais", icon: "⋯" },
];

export default function App() {
  const [tab, setTab] = useState("emily");
  const [agendaVersion, setAgendaVersion] = useState(0);

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">ClinicNow</span>
        <span className="clinica">Clínica Demonstração · v0</span>
      </header>
      <main className="conteudo">
        {tab === "emily" && (
          <Emily onAgendou={() => setAgendaVersion((v) => v + 1)} />
        )}
        {tab === "agenda" && <Agenda key={agendaVersion} />}
        {tab === "pacientes" && <Pacientes />}
        {tab === "mais" && <Mais />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "tab ativa" : "tab"}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icone">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
