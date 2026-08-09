import React, { useEffect, useRef, useState } from "react";
import { Conversation } from "@elevenlabs/client";
import { supabase, carregarServicos, acharServico, fmtUSD } from "../supabase.js";
import { formatarInicio } from "./Agenda.jsx";
import { criarEventoGoogle, TOKEN_SERVER } from "../gcal.js";
import { buscarConflitos, faixaHorario } from "../conflitos.js";

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
  const [servicos, setServicos] = useState([]);
  const convRef = useRef(null);
  const fimRef = useRef(null);

  useEffect(() => {
    carregarServicos().then(setServicos).catch(() => {});
  }, []);

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

  async function confirmarProposta(idx, forcar = false) {
    const msg = mensagens[idx];
    if (!msg?.proposta || msg.confirmada) return;
    const { paciente, servico, inicio } = msg.proposta;
    const svc = acharServico(servicos, servico);
    // Anti-overbooking: mesma checagem da Agenda antes de gravar
    if (!forcar) {
      try {
        const lista = await buscarConflitos({
          inicio,
          duracaoMin: svc?.duracao_min || 60,
          servicos,
        });
        if (lista.length) {
          setMensagens((prev) =>
            prev.map((m, i) => (i === idx ? { ...m, conflitos: lista } : m))
          );
          return;
        }
      } catch (e) {
        setErro(String(e?.message || e));
        return;
      }
    }
    const { data, error } = await supabase
      .from("clinicnow_consultas")
      .insert({
        paciente_nome: paciente || "Paciente (via Emily)",
        servico: svc?.nome || servico,
        servico_id: svc?.id || null,
        preco_usd: svc ? svc.preco_usd : null,
        inicio: inicio.toISOString(),
        origem: "emily",
        status: "agendada",
      })
      .select()
      .single();
    if (error) return setErro(error.message);
    setMensagens((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, confirmada: true, conflitos: null } : m))
    );
    onAgendou?.();
    const g = await criarEventoGoogle(data, svc);
    if (!g.ok) {
      setMensagens((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, avisoGcal: true } : m))
      );
    }
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
            agendamento — ele cai direto na Agenda com o preço do catálogo.
          </p>
          <button onClick={conectar} disabled={status === "conectando"}>
            {status === "conectando" ? "Conectando…" : "Iniciar conversa"}
          </button>
        </div>
      )}
      {erro && <p className="erro">{erro}</p>}
      <div className="chat-mensagens">
        {mensagens.map((m, i) => {
          const svc = m.proposta ? acharServico(servicos, m.proposta.servico) : null;
          return (
            <div key={i} className={`bolha bolha-${m.de}`}>
              {m.texto && <p>{m.texto}</p>}
              {m.proposta && (
                <div className="proposta">
                  <div className="sub">
                    {m.proposta.servico} · {formatarInicio(m.proposta.inicio.toISOString())}
                    {m.proposta.paciente ? ` · ${m.proposta.paciente}` : ""}
                    {svc ? ` · ${fmtUSD(svc.preco_usd)}` : ""}
                  </div>
                  {m.confirmada ? (
                    <span className="selo selo-emily">agendado ✓</span>
                  ) : m.conflitos ? (
                    <div className="conflito" role="alert">
                      <strong>⚠️ Conflito de horário</strong>
                      {m.conflitos.map((c) => (
                        <p key={c.id} className="sub">
                          Já existe <strong>{c.servico}</strong> — {c.paciente_nome} (
                          {faixaHorario(c, servicos)})
                        </p>
                      ))}
                      <p className="sub">Peça outro horário à Emily, ou confirme mesmo assim:</p>
                      <button
                        className="botao-leve"
                        onClick={() => confirmarProposta(i, true)}
                      >
                        Confirmar mesmo assim
                      </button>
                    </div>
                  ) : (
                    <button className="botao-confirmar" onClick={() => confirmarProposta(i)}>
                      ✓ Confirmar agendamento
                    </button>
                  )}
                  {m.avisoGcal && (
                    <span className="sub">
                      Google Agenda não conectado — consulta salva; use o .ics na Agenda.
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
