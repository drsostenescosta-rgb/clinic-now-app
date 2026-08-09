import React, { useEffect, useState } from "react";
import { carregarServicos, fmtUSD, CORES_CATEGORIA } from "../supabase.js";

// v1.1: catálogo é SOMENTE LEITURA no app. A política RLS de UPDATE anônimo em
// clinicnow_servicos foi removida (qualquer pessoa com a chave publishable podia
// alterar preços). Edição volta com login do dono no E2.
// Decisão: docs/decisoes/2026-08-09-v1.1-rls-anon-minimo.md
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
                <span className="sub">{s.duracao_min} min</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="sub nota">
        🔒 Por segurança, o catálogo é somente leitura nesta versão: alterar preços vai exigir o
        login do dono (E2 do backlog). Até lá, mudanças de preço são feitas direto no banco e
        sincronizadas na Emily com <code>npm run emily:update</code>.
      </p>
    </div>
  );
}
