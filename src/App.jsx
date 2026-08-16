import React, { useState } from "react";
import Emily from "./tabs/Emily.jsx";
import Aprovacoes from "./tabs/Aprovacoes.jsx";
import PedidosSite from "./tabs/PedidosSite.jsx";
import Depoimentos from "./tabs/Depoimentos.jsx";
import Agenda from "./tabs/Agenda.jsx";
import Pacientes from "./tabs/Pacientes.jsx";
import Servicos from "./tabs/Servicos.jsx";
import Financeiro from "./tabs/Financeiro.jsx";
import Config from "./tabs/Config.jsx";
import EmBreve from "./tabs/EmBreve.jsx";
import { OwnerGate, useAuth } from "./auth.jsx";
import { supabase } from "./supabase.js";
import filaDemo from "./demo/fila-andreia.json";

// O nome da clínica vem da configuração real do piloto, não fica escrito na tela.
// Trocar de clínica é trocar o arquivo de configuração.
const NOME_CLINICA = filaDemo.clinica || "ClinicNow";

// Símbolo Z-Portal, o mesmo SVG da marca em drsostenescosta-rgb.github.io/assets/marca.
// Inline em vez de <img> para herdar a cor do contexto (branco na topbar, verde no rodapé).
function SimboloZatheon({ className = "marca-simbolo" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="Zatheon" focusable="false">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M18 4h28c7.732 0 14 6.268 14 14v40H46v-8H18v8H4V18C4 10.268 10.268 4 18 4Zm-2 13h32v7L29 41h19v7H16v-7l19-17H16v-7Z"
      />
    </svg>
  );
}

/** Assinatura: a Andreia e a Lohane precisam saber de quem é o produto que estão usando. */
function RodapeMarca() {
  return (
    <footer className="rodape-marca">
      <SimboloZatheon />
      <span>
        <strong>ClinicNow</strong> é um produto <strong>Zatheon</strong>
      </span>
      <span className="rodape-sep">·</span>
      <span>Sostenes Costa Paiva — biomédico, fisioterapeuta e fundador</span>
      <span className="rodape-sep">·</span>
      <span>Piloto Fase 1 — operação assistida</span>
    </footer>
  );
}

const MODULOS = [
  // Aprovações vem primeiro: na Fase 1 é a tela onde a dona realmente trabalha.
  { id: "aprovacoes", label: "Aprovações", icon: "✅" },
  // Logo depois de Aprovações: é a outra caixa de entrada onde tem cliente esperando.
  { id: "pedidos", label: "Pedidos do site", icon: "🌐" },
  // Depoimento nao vai ao ar sozinho: sem esta aba, a secao do site fica vazia.
  { id: "depoimentos", label: "Depoimentos", icon: "⭐" },
  { id: "agenda", label: "Agenda", icon: "📅" },
  { id: "emily", label: "Emily", icon: "💬" },
  { id: "pacientes", label: "Pacientes", icon: "🧑‍⚕️" },
  { id: "servicos", label: "Serviços", icon: "💆" },
  { id: "financeiro", label: "Financeiro", icon: "💵" },
  { id: "crescimento", label: "Crescimento", icon: "📈", embreve: "Marketing e captação de pacientes com anonimização LGPD." },
  { id: "lia", label: "Lia", icon: "🩺", embreve: "Avaliação clínica com IA: triagem, copiloto do profissional e nota SOAP." },
  { id: "vitrine", label: "Vitrine", icon: "🏪", embreve: "Site público da clínica: serviços, preços e agendamento online." },
  { id: "config", label: "Configurações", icon: "⚙️" },
];

export default function App() {
  return <OwnerGate><AppInterno /></OwnerGate>;
}

function AppInterno() {
  const { modo } = useAuth();
  const [tab, setTab] = useState("aprovacoes");
  const [menuAberto, setMenuAberto] = useState(false);
  const [agendaVersion, setAgendaVersion] = useState(0);

  // Modo operação = só o Painel de Aprovação. As outras abas leem tabelas que a Andreia ainda
  // não tem permissão para ver; aba que dá erro ao abrir ensina a desconfiar do sistema inteiro.
  const soAprovacoes = modo === "operacao";
  const modulos = soAprovacoes ? MODULOS.filter((m) => m.id === "aprovacoes" || m.id === "pedidos" || m.id === "depoimentos") : MODULOS;
  const ativo = modulos.find((m) => m.id === tab);

  function irPara(id) {
    setTab(id);
    setMenuAberto(false);
  }

  return (
    <div className="layout">
      <header className="topbar">
        <button
          className="hamburguer"
          onClick={() => setMenuAberto((v) => !v)}
          aria-label="Abrir menu de módulos"
          aria-expanded={menuAberto}
        >
          ☰
        </button>
        <span className="marca">
          <SimboloZatheon />
          <span className="logo">
            ClinicNow<span className="logo-sufixo">Zatheon</span>
          </span>
        </span>
        <span className="clinica">
          {modo === "synthetic" ? `${NOME_CLINICA} · agenda e pacientes no navegador` : modo === "operacao" ? `${NOME_CLINICA} · aprovação assistida` : `${NOME_CLINICA} · acesso autenticado`}
        </span>
        {(modo === "owner" || modo === "operacao") && <button className="botao-leve" onClick={() => supabase.auth.signOut()}>Sair</button>}
      </header>
      <div className="corpo">
        <nav className={menuAberto ? "sidebar aberta" : "sidebar"} aria-label="Módulos">
          {modulos.map((m) => (
            <button
              key={m.id}
              className={tab === m.id ? "item-menu ativo" : "item-menu"}
              onClick={() => irPara(m.id)}
              aria-label={m.embreve ? `${m.label} (em breve)` : m.label}
              aria-current={tab === m.id ? "page" : undefined}
            >
              <span className="item-icone" aria-hidden="true">{m.icon}</span>
              <span className="item-rotulo">{m.label}</span>
              {m.embreve && <span className="ponto-embreve" title="em breve" />}
            </button>
          ))}
        </nav>
        {menuAberto && <div className="sombra-menu" onClick={() => setMenuAberto(false)} />}
        <main className="conteudo">
          {tab === "aprovacoes" && <Aprovacoes />}
          {tab === "pedidos" && <PedidosSite />}
          {tab === "depoimentos" && <Depoimentos />}
          {!soAprovacoes && tab === "agenda" && <Agenda key={agendaVersion} />}
          {!soAprovacoes && tab === "emily" && <Emily onAgendou={() => setAgendaVersion((v) => v + 1)} />}
          {!soAprovacoes && tab === "pacientes" && <Pacientes />}
          {!soAprovacoes && tab === "servicos" && <Servicos />}
          {!soAprovacoes && tab === "financeiro" && <Financeiro />}
          {!soAprovacoes && tab === "config" && <Config />}
          {ativo?.embreve && <EmBreve nome={ativo.label} icone={ativo.icon} desc={ativo.embreve} />}
          <RodapeMarca />
        </main>
      </div>
    </div>
  );
}
