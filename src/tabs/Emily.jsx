import React, { useEffect, useRef, useState } from "react";
import { Conversation } from "@elevenlabs/client";
import { supabase } from "../supabase.js";
import { formatarInicio } from "./Agenda.jsx";

const TOKEN_SERVER = "http://localhost:4790";

// A Emily marca propostas de agendamento com a linha:
// [PROPOSTA] paciente=<nome>; servico=<serviço>; inicio=YYYY-MM-DDTHH:MM
function extrairProposta(texto) {
  const m = texto.match(/\[PROPOSTA\]\s*([^\n\]]+)/i);
  if (!m) return null;
  const campos = {};
  for (const par of m[1].split(";")) {
    const [k, ...v] = par.split("=");
    if (k && v.length) campos[k.trim().toLowerCase()] = v.join("=").trim();
  }
  if (!campos.servico || !campos.inicio) return null;
  const inicio = new Date(campos.inicio);
  if (isNaN(inicio.getTime())) return null;
  return { paciente: campos.paciente || "", servico: campos.servico, inicio };
}

function limparTexto(texto) {
  return texto.replace(/\[PROPOSTA\][^\n]*/gi, "").trim();
}

export default function Emily({ onAgendou }) {
  const [status, setStatus] = useState("desconectada"); // desconectada | conectando | conectada | erro
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const convRef = useRef(null);
  const fimRef = useRef(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  useEffect(() => {
    return () => {
      convRef.current?.endSession().catch(() => {});
    };
  }, []);

  async function conectar() {
    setStatus("conectando");
    setErro("");
    try {
      const r = await fetch(`${TOKEN_SERVER}/signed-url`);
      if (!r.ok) throw new Error("Servidor de token não respondeu (rode `npm run dev`).");
      const { signed_url: signedUrl } = await r.json();
      if (!signedUrl) throw new Error("signed_url ausente na resposta do servidor.");
      const agora = new Date();
      convRef.current = await Conversation.startSession({
        signedUrl,
        textOnly: true,
        dynamicVariables: {
          data_hoje: agora.toLocaleString("pt-BR", {
            weekday: "long",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          data_hoje_iso: agora.toISOString().slice(0, 16),
        },
        onMessage: (evt) => {
          const source = evt?.source;
          const message = typeof evt === "string" ? evt : evt?.message;
          if (!message || source !== "ai") return;
          setMensagens((prev) => [
            ...prev,
            { de: "emily", texto: limparTexto(message), proposta: extrairProposta(message) },
          ]);
        },
        onStatusChange: (s) => {
          const v = typeof s === "string" ? s : s?.status;
          if (v === "disconnected") setStatus("desconectada");
        },
        onError: (e) => setErro(String(e?.message || e)),
      });
      setStatus("conectada");
    } catch (e) {
      setStatus("erro");
      setErro(String(e?.message || e));
    }
  }

  function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || !convRef.current) return;
    convRef.current.sendUserMessage(t);
    setMensagens((prev) => [...prev, { de: "voce", texto: t }]);
    setTexto("");
  }

  async function confirmarProposta(idx) {
    const msg = mensagens[idx];
    if (!msg?.proposta || msg.confirmada) return;
    const { paciente, servico, inicio } = msg.proposta;
    const { error } = await supabase.from("clinicnow_consultas").insert({
      paciente_nome: paciente || "Paciente (via Emily)",
      servico,
      inicio: inicio.toISOString(),
      origem: "emily",
    });
    if (error) return setErro(error.message);
    setMensagens((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, confirmada: true } : m))
    );
    onAgendou?.();
  }

  return (
    <div className="painel painel-chat">
      <div className="chat-cabecalho">
        <h2>Emily — Recepção</h2>
        <span className={`status status-${status}`}>{status}</span>
      </div>
      {status !== "conectada" && (
        <div className="chat-vazio">
          <p className="sub">
            Emily é a recepcionista com IA da clínica (ela se identifica como
            assistente virtual). Converse por texto, peça horários e confirme o
            agendamento — ele cai direto na Agenda.
          </p>
          <button onClick={conectar} disabled={status === "conectando"}>
            {status === "conectando" ? "Conectando…" : "Iniciar conversa"}
          </button>
        </div>
      )}
      {erro && <p className="erro">{erro}</p>}
      <div className="chat-mensagens">
        {mensagens.map((m, i) => (
          <div key={i} className={`bolha bolha-${m.de}`}>
            {m.texto && <p>{m.texto}</p>}
            {m.proposta && (
              <div className="proposta">
                <div className="sub">
                  {m.proposta.servico} · {formatarInicio(m.proposta.inicio.toISOString())}
                  {m.proposta.paciente ? ` · ${m.proposta.paciente}` : ""}
                </div>
                {m.confirmada ? (
                  <span className="selo selo-emily">agendado ✓</span>
                ) : (
                  <button className="botao-confirmar" onClick={() => confirmarProposta(i)}>
                    ✓ Confirmar agendamento
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={fimRef} />
      </div>
      {status === "conectada" && (
        <form className="chat-envio" onSubmit={enviar}>
          <input
            placeholder="Escreva para a Emily…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoFocus
          />
          <button type="submit">Enviar</button>
        </form>
      )}
    </div>
  );
}
