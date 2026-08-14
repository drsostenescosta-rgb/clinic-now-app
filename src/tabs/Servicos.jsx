import React, { useEffect, useState } from "react";
import { carregarServicos, fmtUSD, CORES_CATEGORIA } from "../supabase.js";

// Catálogo somente leitura no navegador; alterações administrativas ficam fora
// desta fundação até existir um fluxo próprio com autorização e auditoria.
export default function Servicos() {
  const [servicos, setServicos] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarServicos(true)
      .then(setServicos)
      .catch((e) => setErro(String(e.message || e)));
  }, []);

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
              <div className="servico-preco">
                <strong>{fmtUSD(s.preco_usd)}</strong>
                <span className="sub">{s.duracao_min} min + buffer {s.buffer_min ?? "pendente"} min</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="sub nota">
        🔒 O catálogo é somente leitura. O modo sintético não deve receber valores ou nomes reais.
      </p>
    </div>
  );
}
