import React, { useEffect, useState } from "react";
import { supabase, CATALOGO } from "../supabase.js";

export function formatarInicio(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Agenda() {
  const [consultas, setConsultas] = useState(null);
  const [pacienteNome, setPacienteNome] = useState("");
  const [servico, setServico] = useState(CATALOGO[0].servico);
  const [inicio, setInicio] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data, error } = await supabase
      .from("clinicnow_consultas")
      .select("*")
      .order("inicio", { ascending: true });
    if (error) setErro(error.message);
    else setConsultas(data);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function agendar(e) {
    e.preventDefault();
    if (!pacienteNome.trim() || !inicio) return;
    setSalvando(true);
    setErro("");
    const { error } = await supabase.from("clinicnow_consultas").insert({
      paciente_nome: pacienteNome.trim(),
      servico,
      inicio: new Date(inicio).toISOString(),
      origem: "manual",
    });
    setSalvando(false);
    if (error) return setErro(error.message);
    setPacienteNome("");
    setInicio("");
    carregar();
  }

  return (
    <div className="painel">
      <h2>Agenda</h2>
      <form className="formulario" onSubmit={agendar}>
        <input
          placeholder="Nome do paciente"
          value={pacienteNome}
          onChange={(e) => setPacienteNome(e.target.value)}
          required
        />
        <select value={servico} onChange={(e) => setServico(e.target.value)}>
          {CATALOGO.map((c) => (
            <option key={c.servico} value={c.servico}>
              {c.servico} — {c.preco}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          required
        />
        <button type="submit" disabled={salvando}>
          {salvando ? "Agendando…" : "Agendar consulta"}
        </button>
      </form>
      {erro && <p className="erro">{erro}</p>}
      {consultas === null ? (
        <p className="sub">Carregando…</p>
      ) : consultas.length === 0 ? (
        <p className="sub">Nenhuma consulta agendada.</p>
      ) : (
        <ul className="lista">
          {consultas.map((c) => (
            <li key={c.id} className="cartao">
              <div>
                <strong>{c.paciente_nome}</strong>
                <div className="sub">
                  {c.servico} · {formatarInicio(c.inicio)}
                </div>
              </div>
              <span className={c.origem === "emily" ? "selo selo-emily" : "selo"}>
                {c.origem === "emily" ? "via Emily" : "manual"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
