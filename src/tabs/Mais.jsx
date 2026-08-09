import React from "react";

const MODULOS = [
  { nome: "Vitrine", desc: "Site de vendas da clínica" },
  { nome: "Lia — Avaliação Clínica", desc: "Avaliação de saúde + copiloto + SOAP" },
  { nome: "Paciente", desc: "Exames, documentos e histórico" },
  { nome: "Produtos", desc: "Catálogo tabelado — fonte de verdade da Emily" },
  { nome: "Crescimento", desc: "Marketing com anonimização LGPD" },
  { nome: "Atendimento Online", desc: "Teleconsulta" },
];

export default function Mais() {
  return (
    <div className="painel">
      <h2>Módulos do produto único</h2>
      <p className="sub">
        Roteiro da unificação (docs/ARQUITETURA_UNIFICACAO.md). Cada módulo entra
        na sua fase.
      </p>
      <ul className="lista">
        {MODULOS.map((m) => (
          <li key={m.nome} className="cartao cartao-embreve">
            <div>
              <strong>{m.nome}</strong>
              <div className="sub">{m.desc}</div>
            </div>
            <span className="selo">em breve</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
