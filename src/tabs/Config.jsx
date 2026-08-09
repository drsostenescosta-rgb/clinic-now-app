import React, { useEffect, useState } from "react";
import { statusGoogleAgenda } from "../gcal.js";

export default function Config() {
  const [gcal, setGcal] = useState(null);

  useEffect(() => {
    statusGoogleAgenda().then(setGcal);
  }, []);

  return (
    <div className="painel">
      <h2>Configurações</h2>
      <div className="cartao cartao-config">
        <div>
          <strong>Google Agenda</strong>
          <div className="sub">
            {gcal === null
              ? "Verificando conexão…"
              : gcal.connected
                ? "Conectado — consultas confirmadas viram eventos automaticamente."
                : "Não conectado — as consultas continuam funcionando; use o botão .ics de cada consulta para levar ao calendário."}
          </div>
        </div>
        <span className={gcal?.connected ? "selo selo-emily" : "selo"}>
          {gcal === null ? "…" : gcal.connected ? "ativo" : "desconectado"}
        </span>
      </div>
      {gcal && !gcal.connected && (
        <div className="cartao cartao-instrucao">
          <strong>Conectar Google Agenda</strong>
          <p className="sub">
            No terminal do Mac, rode o comando abaixo e autorize com a conta Google da clínica
            (drsostenescosta@gmail.com). O app detecta sozinho na próxima consulta confirmada.
          </p>
          <code className="bloco-codigo">composio link googlecalendar</code>
        </div>
      )}
      <div className="cartao cartao-config">
        <div>
          <strong>Moeda</strong>
          <div className="sub">Dólar americano (USD) — catálogo e financeiro.</div>
        </div>
        <span className="selo">US$</span>
      </div>
      <div className="cartao cartao-config">
        <div>
          <strong>Dados</strong>
          <div className="sub">
            v1 single-tenant, sem login, 100% sintético. Login + RLS por dono (E2) é bloqueante
            antes de qualquer dado real.
          </div>
        </div>
        <span className="selo">demo</span>
      </div>
    </div>
  );
}
