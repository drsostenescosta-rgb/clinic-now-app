import React, { useEffect, useMemo, useState } from "react";
import { MODO, supabase, carregarServicos, fmtUSD, corDoServico, reservarConsulta, atualizarConsulta } from "../supabase.js";
import { baixarICS } from "../gcal.js";
import { buscarConflitos, colunasDoDia, faixaHorario } from "../conflitos.js";
import { EXEMPLO_ALIAS_SINTETICO, validarAliasSintetico } from "../syntheticPolicy.js";

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
    const fim = new Date(c.termina_em).getTime();
    const ini = new Date(c.inicio).getTime();
    if (Number.isFinite(fim) && fim > ini) return (fim - ini) / 60000;
    return (c.duracao_snapshot_min ?? s?.duracao_min ?? 60) + (c.buffer_snapshot_min ?? s?.buffer_min ?? 0);
  }

  async function salvarNova({ paciente_nome, servico_id, inicioLocal }) {
    if (MODO === "synthetic" && !validarAliasSintetico(paciente_nome)) throw new Error(`Use somente alias artificial, por exemplo: ${EXEMPLO_ALIAS_SINTETICO}.`);
    const svc = servicos.find((s) => s.id === servico_id);
    if (!svc) throw new Error("Selecione um serviço válido.");
    const data = await reservarConsulta({ paciente_nome, servico_id, inicio: inicioLocal, origem: "manual" });
    setNovo(null);
    carregar();
    setAviso("Consulta reservada sem conflito. Nenhuma integração externa foi acionada.");
    setTimeout(() => setAviso(""), 6000);
  }

  async function salvarDetalhe(c, campos) {
    const svc = servicos.find((s) => s.id === campos.servico_id);
    if (!svc) throw new Error("Selecione um serviço válido.");
    await atualizarConsulta({ id: c.id, servico_id: svc.id, inicio: campos.inicioLocal, tip_usd: campos.tip_usd, status: campos.status });
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
      {MODO === "synthetic" && <p className="aviso">Modo sintético: não digite nomes ou dados reais. Use {EXEMPLO_ALIAS_SINTETICO}.</p>}
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
                  {(() => {
                    const doDia = consultasDoDia(dia);
                    // Eventos simultâneos dividem a coluna lado a lado (estilo Google Calendar)
                    const layout = colunasDoDia(doDia, servicos);
                    return doDia.map((c) => {
                    const ini = new Date(c.inicio);
                    const minutos = (ini.getHours() - HORA_INI) * 60 + ini.getMinutes();
                    if (minutos < 0 || minutos >= (HORA_FIM - HORA_INI) * 60) return null;
                    const dur = duracaoMin(c);
                    const { col, cols } = layout.get(c.id) || { col: 0, cols: 1 };
                    return (
                      <button
                        key={c.id}
                        className={c.status === "cancelada" ? "bloco bloco-cancelado" : "bloco"}
                        style={{
                          top: (minutos / 60) * ALTURA_HORA + 1,
                          height: Math.max((dur / 60) * ALTURA_HORA - 3, 22),
                          left: `calc(${(col * 100) / cols}% + 3px)`,
                          width: `calc(${100 / cols}% - 6px)`,
                          right: "auto",
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
                    });
                  })()}
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

// Conflito nunca pode ser forçado: a pessoa deve escolher outro horário.
function AvisoConflito({ conflitos, servicos, onOutroHorario }) {
  return (
    <div className="conflito" role="alert">
      <strong>⚠️ Conflito de horário</strong>
      {conflitos.map((c) => (
        <p key={c.id} className="sub">
          Já existe <strong>{c.servico}</strong> — {c.paciente_nome} ({faixaHorario(c, servicos)})
        </p>
      ))}
      <div className="modal-acoes">
        <button type="button" onClick={onOutroHorario}>
          Escolher outro horário
        </button>
      </div>
    </div>
  );
}

function ModalNova({ inicio, servicos, pacientes, onFechar, onSalvar }) {
  const [paciente, setPaciente] = useState("");
  const [servicoId, setServicoId] = useState(servicos[0]?.id || "");
  const [inicioLocal, setInicioLocal] = useState(paraInputLocal(inicio));
  const [erro, setErro] = useState("");
  const [conflitos, setConflitos] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const inputInicioRef = React.useRef(null);
  const svc = servicos.find((s) => s.id === servicoId);

  async function submeter(e) {
    e?.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      {
        const lista = await buscarConflitos({
          inicio: new Date(inicioLocal),
          duracaoMin: svc?.duracao_min || 60,
          bufferMin: svc?.buffer_min ?? 0,
          servicos,
        });
        if (lista.length) {
          setConflitos(lista);
          setSalvando(false);
          return;
        }
      }
      await onSalvar({ paciente_nome: paciente.trim(), servico_id: servicoId, inicioLocal });
    } catch (err) {
      setErro(String(err.message || err));
      setSalvando(false);
    }
  }

  function escolherOutroHorario() {
    setConflitos(null);
    inputInicioRef.current?.focus();
  }

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nova consulta</h3>
        <form className="formulario" onSubmit={submeter}>
          <input
            placeholder={MODO === "synthetic" ? EXEMPLO_ALIAS_SINTETICO : "Nome do paciente"}
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
          <select
            value={servicoId}
            onChange={(e) => {
              setServicoId(e.target.value);
              setConflitos(null);
            }}
          >
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} — {fmtUSD(s.preco_usd)} · {s.duracao_min} min + buffer {s.buffer_min ?? "pendente"}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            ref={inputInicioRef}
            value={inicioLocal}
            onChange={(e) => {
              setInicioLocal(e.target.value);
              setConflitos(null);
            }}
            required
          />
          {svc && (
            <p className="sub">
              Valor: <strong>{fmtUSD(svc.preco_usd)}</strong> · {svc.duracao_min} min + buffer {svc.buffer_min ?? "pendente"} min
            </p>
          )}
          {erro && <p className="erro">{erro}</p>}
          {conflitos ? (
            <AvisoConflito
              conflitos={conflitos}
              servicos={servicos}
              onOutroHorario={escolherOutroHorario}
            />
          ) : (
            <div className="modal-acoes">
              <button type="button" className="botao-leve" onClick={onFechar}>
                Fechar
              </button>
              <button type="submit" disabled={salvando}>
                {salvando ? "Verificando…" : "Agendar"}
              </button>
            </div>
          )}
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
  const [conflitos, setConflitos] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const inputInicioRef = React.useRef(null);
  const svc = servicos.find((s) => s.id === servicoId);

  async function submeter(e) {
    e?.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      if (status !== "cancelada") {
        const lista = await buscarConflitos({
          inicio: new Date(inicioLocal),
          duracaoMin: svc?.duracao_min || 60,
          bufferMin: svc?.buffer_min ?? 0,
          servicos,
          ignorarId: consulta.id,
        });
        if (lista.length) {
          setConflitos(lista);
          setSalvando(false);
          return;
        }
      }
      await onSalvar(consulta, { servico_id: servicoId, inicioLocal, tip_usd: tip, status });
    } catch (err) {
      setErro(String(err.message || err));
      setSalvando(false);
    }
  }

  function escolherOutroHorario() {
    setConflitos(null);
    inputInicioRef.current?.focus();
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
          <select
            value={servicoId}
            onChange={(e) => {
              setServicoId(e.target.value);
              setConflitos(null);
            }}
          >
            {!consulta.servico_id && <option value="">{consulta.servico} (catálogo antigo)</option>}
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} — {fmtUSD(s.preco_usd)} · {s.duracao_min} min + buffer {s.buffer_min ?? "pendente"}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            ref={inputInicioRef}
            value={inicioLocal}
            onChange={(e) => {
              setInicioLocal(e.target.value);
              setConflitos(null);
            }}
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
          {conflitos ? (
            <AvisoConflito
              conflitos={conflitos}
              servicos={servicos}
              onOutroHorario={escolherOutroHorario}
            />
          ) : (
            <div className="modal-acoes">
              <button
                type="button"
                className="botao-leve"
                onClick={() => baixarICS(consulta, svc)}
                title="Baixar arquivo de calendário (.ics)"
                aria-label="Baixar arquivo de calendário (.ics)"
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
          )}
        </form>
      </div>
    </div>
  );
}
