import React, { useEffect, useState } from "react";
import { supabase, carregarServicos, invalidarServicos, fmtUSD, CORES_CATEGORIA } from "../supabase.js";

export default function Servicos() {
  const [servicos, setServicos] = useState(null);
  const [editando, setEditando] = useState(null); // id em edição
  const [rascunho, setRascunho] = useState({});
  const [erro, setErro] = useState("");

  async function carregar() {
    try {
      setServicos(await carregarServicos(true));
    } catch (e) {
      setErro(String(e.message || e));
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  function abrirEdicao(s) {
    setEditando(s.id);
    setRascunho({ preco_usd: s.preco_usd, duracao_min: s.duracao_min });
  }

  async function salvar(s) {
    setErro("");
    const { error } = await supabase
      .from("clinicnow_servicos")
      .update({
        preco_usd: Number(rascunho.preco_usd),
        duracao_min: Number(rascunho.duracao_min),
      })
      .eq("id", s.id);
    if (error) return setErro(error.message);
    setEditando(null);
    invalidarServicos();
    carregar();
  }

  return (
    <div className="painel">
      <h2>Serviços</h2>
      <p className="sub">
        Catálogo oficial da clínica — única fonte de preços (em dólar) do app e da Emily.
      </p>
      {erro && <p className="erro">{erro}</p>}
      {servicos === null ? (
        <p className="sub">Carregando…</p>
      ) : (
        <ul className="lista">
          {servicos.map((s) => (
            <li key={s.id} className="cartao">
              <div className="servico-info">
                <span
                  className="pastilha-cor"
                  style={{ background: CORES_CATEGORIA[s.categoria] || "#0f766e" }}
                />
                <div>
                  <strong>{s.nome}</strong>
                  <div className="sub">
                    {s.nome_en} · {s.categoria}
                  </div>
                </div>
              </div>
              {editando === s.id ? (
                <div className="servico-edicao">
                  <label className="sub">
                    US${" "}
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="input-mini"
                      value={rascunho.preco_usd}
                      onChange={(e) => setRascunho({ ...rascunho, preco_usd: e.target.value })}
                    />
                  </label>
                  <label className="sub">
                    min{" "}
                    <input
                      type="number"
                      min="5"
                      step="5"
                      className="input-mini"
                      value={rascunho.duracao_min}
                      onChange={(e) => setRascunho({ ...rascunho, duracao_min: e.target.value })}
                    />
                  </label>
                  <button className="botao-mini" onClick={() => salvar(s)}>✓</button>
                  <button className="botao-mini botao-leve" onClick={() => setEditando(null)}>✕</button>
                </div>
              ) : (
                <div className="servico-preco">
                  <strong>{fmtUSD(s.preco_usd)}</strong>
                  <span className="sub">{s.duracao_min} min</span>
                  <button className="botao-mini botao-leve" onClick={() => abrirEdicao(s)}>
                    Editar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="sub nota">
        Alterou um preço? A Emily usa o catálogo do prompt dela — rode{" "}
        <code>npm run emily:update</code> para sincronizar.
      </p>
    </div>
  );
}
