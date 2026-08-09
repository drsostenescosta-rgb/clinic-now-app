import React, { useEffect, useState } from "react";
import { supabase, fmtUSD } from "../supabase.js";

function inicioDoDia(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function inicioDaSemana(d) {
  const x = inicioDoDia(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export default function Financeiro() {
  const [semana, setSemana] = useState(() => inicioDaSemana(new Date()));
  const [consultas, setConsultas] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      const ini = semana;
      const fim = new Date(ini);
      fim.setDate(fim.getDate() + 7);
      const { data, error } = await supabase
        .from("clinicnow_consultas")
        .select("*")
        .gte("inicio", ini.toISOString())
        .lt("inicio", fim.toISOString())
        .neq("status", "cancelada")
        .order("inicio");
      if (error) setErro(error.message);
      else setConsultas(data);
    })();
  }, [semana]);

  function mudarSemana(dias) {
    const x = new Date(semana);
    x.setDate(x.getDate() + dias);
    setSemana(x);
  }

  if (erro) return <div className="painel"><h2>Financeiro</h2><p className="erro">{erro}</p></div>;
  if (consultas === null)
    return <div className="painel"><h2>Financeiro</h2><p className="sub">Carregando…</p></div>;

  const hoje0 = inicioDoDia(new Date());
  const amanha0 = new Date(hoje0);
  amanha0.setDate(amanha0.getDate() + 1);
  const doDia = consultas.filter((c) => {
    const d = new Date(c.inicio);
    return d >= hoje0 && d < amanha0;
  });

  const soma = (lista, campo) => lista.reduce((t, c) => t + Number(c[campo] || 0), 0);
  const rotuloSemana = `${semana.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${new Date(semana.getTime() + 6 * 86400000).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
  const cartoes = [
    { titulo: "Hoje", lista: doDia },
    { titulo: `Semana ${rotuloSemana}`, lista: consultas },
  ];

  return (
    <div className="painel">
      <div className="agenda-topo">
        <h2>Financeiro</h2>
        <div className="agenda-nav">
          <button className="botao-leve" onClick={() => mudarSemana(-7)}>‹</button>
          <button className="botao-leve" onClick={() => setSemana(inicioDaSemana(new Date()))}>Hoje</button>
          <button className="botao-leve" onClick={() => mudarSemana(7)}>›</button>
        </div>
      </div>
      <p className="sub">Consultas agendadas/concluídas (canceladas ficam de fora). Valores em dólar.</p>
      <div className="fin-cartoes">
        {cartoes.map(({ titulo, lista }) => {
          const servicosUSD = soma(lista, "preco_usd");
          const gorjetasUSD = soma(lista, "tip_usd");
          return (
            <div key={titulo} className="fin-cartao">
              <h3>{titulo}</h3>
              <div className="fin-total">{fmtUSD(servicosUSD + gorjetasUSD)}</div>
              <div className="fin-linha">
                <span className="sub">Serviços</span>
                <strong>{fmtUSD(servicosUSD)}</strong>
              </div>
              <div className="fin-linha">
                <span className="sub">Gorjetas</span>
                <strong>{fmtUSD(gorjetasUSD)}</strong>
              </div>
              <div className="fin-linha">
                <span className="sub">Consultas</span>
                <strong>{lista.length}</strong>
              </div>
            </div>
          );
        })}
      </div>
      <h3 className="fin-subtitulo">Consultas da semana</h3>
      {consultas.length === 0 ? (
        <p className="sub">Nenhuma consulta nesta semana.</p>
      ) : (
        <ul className="lista">
          {consultas.map((c) => (
            <li key={c.id} className="cartao">
              <div>
                <strong>{c.paciente_nome}</strong>
                <div className="sub">
                  {c.servico} ·{" "}
                  {new Date(c.inicio).toLocaleString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="fin-valores">
                <strong>{fmtUSD(Number(c.preco_usd || 0) + Number(c.tip_usd || 0))}</strong>
                {Number(c.tip_usd) > 0 && (
                  <span className="sub">inclui gorjeta {fmtUSD(c.tip_usd)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
