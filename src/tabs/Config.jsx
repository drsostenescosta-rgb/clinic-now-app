import React from "react";
import { MODO, OWNER_CONFIG_ERROR } from "../supabase.js";

export default function Config() {
  return <div className="painel">
    <h2>Configurações</h2>
    <div className="cartao cartao-config"><div><strong>Modo de operação</strong><div className="sub">{MODO === "synthetic" ? "Dados exclusivamente artificiais no navegador; integrações externas bloqueadas." : OWNER_CONFIG_ERROR || "Owner autenticado; exige E2 aplicada e verificada antes de dados reais."}</div></div><span className="selo">{MODO}</span></div>
    <div className="cartao cartao-config"><div><strong>Integrações externas</strong><div className="sub">WhatsApp, Instagram, Google Agenda, ElevenLabs e anamnese não fazem parte desta E2. Permanecem desativadas também no modo owner.</div></div><span className="selo">desativadas</span></div>
    <div className="cartao cartao-config"><div><strong>Moeda</strong><div className="sub">Dólar americano (USD), somente para demonstração do catálogo sintético.</div></div><span className="selo">US$</span></div>
  </div>;
}
