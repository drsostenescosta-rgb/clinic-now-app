import React from "react";

export default function EmBreve({ nome, icone, desc }) {
  return (
    <div className="painel embreve">
      <div className="embreve-icone">{icone}</div>
      <h2>{nome}</h2>
      <p className="sub">{desc}</p>
      <span className="selo selo-embreve">em breve</span>
      <p className="sub nota">
        Este módulo faz parte do roteiro do produto único (docs/arquitetura.md) e entra na fase dele.
      </p>
    </div>
  );
}
