import React, { useEffect, useMemo, useState } from "react";
import { supabase, carregarServicos, fmtUSD, corDoServico } from "../supabase.js";
import { criarEventoGoogle, baixarICS } from "../gcal.js";

export function formatarInicio(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const HORA_INI = 8;
const HORA_FIM = 20; // exclusivo
const ALTURA_HORA = 56; // px por hora
const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function inicioDaSemana(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // segunda
  return x;
}
function addDias(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function paraInputLocal(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function mesmaData(a, b) {
  return a.toDateString() === b.toDateString();
}

export default function Agenda() {
  const [semana, setSemana] = useState(() => inicioDaSemana(new Date()));
  const [consultas, setConsultas] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [novo, setNovo] = useState(null); // { inicio: Date } → modal de criação
  const [detalhe, setDetalhe] = useState(null); // consulta → modal de detalhe

  const fimSemana = useMemo(() => addDias(semana, 7), [semana]);

  async function carregar() {
    setErro("");
    try {
      const [svc, { data: cons, error: e1 }, { data: pacs }] = await Promise.all([
        carregarServicos(),
        supabase
          .from("clinicnow_consultas")
          .select("*")
          .gte("inicio", semana.toISOString())
          .lt("inicio", fimSemana.toISOString())
          .order("inicio"),
        supabase.from("clinicnow_pacientes").select("id,nome").order("nome"),
      ]);
      if (e1) throw new Error(e1.message);
      setServicos(svc);
      setConsultas(cons);
      setPacientes(pacs || []);
    } catch (e) {
      setErro(String(e.message || e));
    }
  }

  useEffect(() => {
    carregar();
  }, [semana]);

  const hoje = new Date();
  const horas = [];
  for (let h = HORA_INI; h < HORA_FIM; h++) horas.push(h);

  function consultasDoDia(dia) {
    return (consultas || []).filter((c) => mesmaData(new Date(c.inicio), dia));
  }
  function duracaoMin(c) {
    const s = servicos.find((x) => x.id === c.servico_id);
    return s?.duracao_min || 60;
  }

  async function salvarNova({ paciente_nome, servico_id, inicioLocal }) {
    const svc = servicos.find((s) => s.id === servico_id);
    const linha = {
      paciente_nome,
      servico: svc?.nome || "Consulta",
      servico_id: servico_id || null,
      preco_usd: svc ? svc.preco_usd : null,
      inicio: new Date(inicioLocal).toISOString(),
      origem: "manual",
      status: "agendada",
    };
    const { data, error } = await supabase
      .from("clinicnow_consultas")
      .insert(linha)
      .select()
      .single();
    if (error) throw new Error(error.message);
    setNovo(null);
    carregar();
    const g = await criarEventoGoogle(data, svc);
    setAviso(
      g.ok
        ? "Consulta agendada e enviada ao Google Agenda ✓"
        : "Consulta agendada. Google Agenda não conectado — use o .ics no detalhe da consulta."
    );
    setTimeout(() => setAviso(""), 6000);
    if (g.ok) carregar();
  }

  async function salvarDetalhe(c, campos) {
    const svc = servicos.find((s) => s.id === campos.servico_id);
    const upd = {
      servico_id: campos.servico_id || null,
      servico: svc?.nome || c.servico,
      preco_usd: svc ? svc.preco_usd : c.preco_usd,
      inicio: new Date(campos.inicioLocal).toISOString(),
      tip_usd: campos.tip_usd === "" ? 0 : Number(campos.tip_usd),
      status: campos.status,
    };
    const { error } = await supabase.from("clinicnow_consultas").update(upd).eq("id", c.id);
    if (error) throw new Error(error.message);
    setDetalhe(null);
    carregar();
  }

  const rotuloSemana = `${semana.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${addDias(semana, 6).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <div className="painel painel-agenda">
      <div className="agenda-topo">
        <h2>Agenda</h2>
        <div className="agenda-nav">
          <button className="botao-leve" onClick={() => setSemana(addDias(semana, -7))}>‹</button>
          <button className="botao-leve" onClick={() => setSemana(inicioDaSemana(new Date()))}>Hoje</button>
          <button className="botao-leve" onClick={() => setSemana(addDias(semana, 7))}>›</button>
          <span className="agenda-rotulo">{rotuloSemana}</span>
        </div>
      </div>
      {erro && <p className="erro">{erro}</p>}
      {aviso && <p className="aviso">{aviso}</p>}
      {consultas === null ? (
        <p className="sub">Carregando…</p>
      ) : (
        <div className="grade-envelope">
          <div className="grade">
            <div className="grade-cab canto" />
            {DIAS.map((d, i) => {
              const dia = addDias(semana, i);
              return (
                <div key={d} className={mesmaData(dia, hoje) ? "grade-cab dia-hoje" : "grade-cab"}>
                  <span className="dia-nome">{d}</span>
                  <span className="dia-num">{dia.getDate()}</span>
                </div>
              );
            })}
            <div className="coluna-horas">
              {horas.map((h) => (
                <div key={h} className="hora-rotulo" style={{ height: ALTURA_HORA }}>
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {DIAS.map((_, i) => {
              const dia = addDias(semana, i);
              return (
                <div
                  key={i}
                  className={mesmaData(dia, hoje) ? "coluna-dia coluna-hoje" : "coluna-dia"}
                  style={{ height: horas.length * ALTURA_HORA }}
                >
                  {horas.map((h) => (
                    <div
                      key={h}
                      className="celula-hora"
                      style={{ top: (h - HORA_INI) * ALTURA_HORA, height: ALTURA_HORA }}
                      onClick={() => {
                        const d = new Date(dia);
                        d.setHours(h, 0, 0, 0);
                        setNovo({ inicio: d });
                      }}
                    />
                  ))}
                  {consultasDoDia(dia).map((c) => {
                    const ini = new Date(c.inicio);
                    const minutos = (ini.getHours() - HORA_INI) * 60 + ini.getMinutes();
                    if (minutos < 0 || minutos >= (HORA_FIM - HORA_INI) * 60) return null;
                    const dur = duracaoMin(c);
                    return (
                      <button
                        key={c.id}
                        className={c.status === "cancelada" ? "bloco bloco-cancelado" : "bloco"}
                        style={{
                          top: (minutos / 60) * ALTURA_HORA + 1,
                          height: Math.max((dur / 60) * ALTURA_HORA - 3, 22),
                          background: corDoServico(servicos, c),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetalhe(c);
                        }}
                        title={`${c.servico} — ${c.paciente_nome}`}
                      >
                        <span className="bloco-hora">
                          {ini.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="bloco-nome">{c.paciente_nome}</span>
                        <span className="bloco-servico">{c.servico}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {novo && (
        <ModalNova
          inicio={novo.inicio}
          servicos={servicos}
          pacientes={pacientes}
          onFechar={() => setNovo(null)}
          onSalvar={salvarNova}
        />
      )}
      {detalhe && (
        <ModalDetalhe
          consulta={detalhe}
          servicos={servicos}
          onFechar={() => setDetalhe(null)}
          onSalvar={salvarDetalhe}
        />
      )}
    </div>
  );
}

function ModalNova({ inicio, servicos, pacientes, onFechar, onSalvar }) {
  const [paciente, setPaciente] = useState("");
  const [servicoId, setServicoId] = useState(servicos[0]?.id || "");
  const [inicioLocal, setInicioLocal] = useState(paraInputLocal(inicio));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const svc = servicos.find((s) => s.id === servicoId);

  async function submeter(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await onSalvar({ paciente_nome: paciente.trim(), servico_id: servicoId, inicioLocal });
    } catch (err) {
      setErro(String(err.message || err));
      setSalvando(false);
    }
  }

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nova consulta</h3>
        <form className="formulario" onSubmit={submeter}>
          <input
            placeholder="Nome do paciente"
            list="lista-pacientes"
            value={paciente}
            onChange={(e) => setPaciente(e.target.value)}
            required
            autoFocus
          />
          <datalist id="lista-pacientes">
            {pacientes.map((p) => (
              <option key={p.id} value={p.nome} />
            ))}
          </datalist>
          <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} — {fmtUSD(s.preco_usd)} · {s.duracao_min} min
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={inicioLocal}
            onChange={(e) => setInicioLocal(e.target.value)}
            required
          />
          {svc && (
            <p className="sub">
              Valor: <strong>{fmtUSD(svc.preco_usd)}</strong> · {svc.duracao_min} min
            </p>
          )}
          {erro && <p className="erro">{erro}</p>}
          <div className="modal-acoes">
            <button type="button" className="botao-leve" onClick={onFechar}>
              Fechar
            </button>
            <button type="submit" disabled={salvando}>
              {salvando ? "Agendando…" : "Agendar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalDetalhe({ consulta, servicos, onFechar, onSalvar }) {
  const [servicoId, setServicoId] = useState(consulta.servico_id || "");
  const [inicioLocal, setInicioLocal] = useState(paraInputLocal(new Date(consulta.inicio)));
  const [tip, setTip] = useState(consulta.tip_usd || 0);
  const [status, setStatus] = useState(consulta.status || "agendada");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const svc = servicos.find((s) => s.id === servicoId);

  async function submeter(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await onSalvar(consulta, { servico_id: servicoId, inicioLocal, tip_usd: tip, status });
    } catch (err) {
      setErro(String(err.message || err));
      setSalvando(false);
    }
  }

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{consulta.paciente_nome}</h3>
        <p className="sub">
          {consulta.origem === "emily" ? "Agendada via Emily" : "Agendada manualmente"} ·{" "}
          {consulta.google_event_id ? "no Google Agenda ✓" : "fora do Google Agenda"}
        </p>
        <form className="formulario" onSubmit={submeter}>
          <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
            {!consulta.servico_id && <option value="">{consulta.servico} (catálogo antigo)</option>}
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} — {fmtUSD(s.preco_usd)} · {s.duracao_min} min
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={inicioLocal}
            onChange={(e) => setInicioLocal(e.target.value)}
          />
          <label className="campo-rotulado">
            <span className="sub">Gorjeta (US$)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
            />
          </label>
          <label className="campo-rotulado">
            <span className="sub">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="agendada">Agendada</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </label>
          <p className="sub">
            Serviço: <strong>{fmtUSD(svc ? svc.preco_usd : consulta.preco_usd)}</strong> · Gorjeta:{" "}
            <strong>{fmtUSD(tip || 0)}</strong>
          </p>
          {erro && <p className="erro">{erro}</p>}
          <div className="modal-acoes">
            <button
              type="button"
              className="botao-leve"
              onClick={() => baixarICS(consulta, svc)}
              title="Baixar arquivo de calendário (.ics)"
            >
              📆 .ics
            </button>
            <button type="button" className="botao-leve" onClick={onFechar}>
              Fechar
            </button>
            <button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
