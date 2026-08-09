import React, { useEffect, useState } from "react";
import { supabase } from "../supabase.js";

export default function Pacientes() {
  const [pacientes, setPacientes] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data, error } = await supabase
      .from("clinicnow_pacientes")
      .select("*")
      .order("criado_em", { ascending: false });
    if (error) setErro(error.message);
    else setPacientes(data);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function cadastrar(e) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    setErro("");
    const { error } = await supabase
      .from("clinicnow_pacientes")
      .insert({ nome: nome.trim(), telefone: telefone.trim() || null });
    setSalvando(false);
    if (error) return setErro(error.message);
    setNome("");
    setTelefone("");
    carregar();
  }

  return (
    <div className="painel">
      <h2>Pacientes</h2>
      <form className="formulario" onSubmit={cadastrar}>
        <input
          placeholder="Nome do paciente"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <input
          placeholder="Telefone (opcional)"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
        <button type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Cadastrar paciente"}
        </button>
      </form>
      {erro && <p className="erro">{erro}</p>}
      {pacientes === null ? (
        <p className="sub">Carregando…</p>
      ) : pacientes.length === 0 ? (
        <p className="sub">Nenhum paciente ainda.</p>
      ) : (
        <ul className="lista">
          {pacientes.map((p) => (
            <li key={p.id} className="cartao">
              <div>
                <strong>{p.nome}</strong>
                {p.telefone && <div className="sub">{p.telefone}</div>}
              </div>
              <span className="sub">
                {new Date(p.criado_em).toLocaleDateString("pt-BR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
