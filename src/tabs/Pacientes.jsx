import React, { useEffect, useState } from "react";
import { MODO, supabase, criarPaciente } from "../supabase.js";
import { EXEMPLO_ALIAS_SINTETICO, validarAliasSintetico } from "../syntheticPolicy.js";

export default function Pacientes() {
  const [pacientes, setPacientes] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
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
    if (MODO === "synthetic" && !validarAliasSintetico(nome)) { setSalvando(false); setErro(`Use somente alias artificial, por exemplo: ${EXEMPLO_ALIAS_SINTETICO}.`); return; }
    let error = null;
    try { await criarPaciente({ nome: nome.trim(), telefone: MODO === "owner" ? telefone.trim() || null : null, drive_url: MODO === "owner" ? driveUrl.trim() || null : null }); }
    catch (e) { error = e; }
    setSalvando(false);
    if (error) return setErro(error.message);
    setNome("");
    setTelefone("");
    setDriveUrl("");
    carregar();
  }

  return (
    <div className="painel">
      <h2>Pacientes</h2>
      {MODO === "synthetic" && <p className="aviso">Demonstração sem dados pessoais: use aliases como <strong>{EXEMPLO_ALIAS_SINTETICO}</strong>. Não digite nomes, telefones ou links reais.</p>}
      <form className="formulario" onSubmit={cadastrar}>
        <input
          placeholder={MODO === "synthetic" ? EXEMPLO_ALIAS_SINTETICO : "Nome do paciente"}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        {MODO === "owner" && <input
          placeholder="Telefone (opcional)"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />}
        {MODO === "owner" && <input
          placeholder="Link da pasta no Google Drive (opcional)"
          type="url"
          value={driveUrl}
          onChange={(e) => setDriveUrl(e.target.value)}
        />}
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
              <div className="paciente-acoes">
                {p.drive_url && (
                  <a
                    className="botao-leve botao-link"
                    href={p.drive_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    📁 Prontuário no Drive
                  </a>
                )}
                <span className="sub">
                  {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
