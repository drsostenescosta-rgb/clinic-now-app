// Depoimentos — o que clientes escreveram no site, esperando a Andréia liberar.
//
// Nada aqui vai ao ar sozinho. A tabela nasce com status 'novo' e o site só lê linhas
// 'publicado' — se esta tela nunca for aberta, o site simplesmente não mostra depoimento.
// Falhar em silêncio é o comportamento certo: melhor uma seção vazia do que texto de
// estranho aparecendo na página da mãe de Sostenes.
//
// O contato de quem escreveu aparece SÓ aqui. O anônimo não tem grant nessa coluna.
import { useCallback, useEffect, useState } from "react";
import { supabase, MODO } from "../supabase.js";

const TABELA = "andreia_depoimentos";

const ABAS = [
  { id: "novo", label: "Esperando você" },
  { id: "publicado", label: "No site" },
  { id: "recusado", label: "Recusados" },
];

function estrelas(n) {
  return n ? "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n) : "—";
}

export default function Depoimentos() {
  const [linhas, setLinhas] = useState(null);
  const [aba, setAba] = useState("novo");
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setErro("");
    const { data, error } = await supabase
      .from(TABELA)
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(200);
    if (error) { setErro(error.message); setLinhas([]); return; }
    setLinhas(data || []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function decidir(id, status) {
    const antes = linhas;
    const publicado_em = status === "publicado" ? new Date().toISOString() : null;
    setLinhas((l) => l.map((x) => (x.id === id ? { ...x, status, publicado_em } : x)));
    const { error } = await supabase.from(TABELA).update({ status, publicado_em }).eq("id", id);
    if (error) { setLinhas(antes); setErro(error.message); }
  }

  if (MODO === "synthetic") {
    return (
      <div className="cartao">
        <h2>Depoimentos</h2>
        <p className="suave">
          Esta aba lê o que clientes reais escreveram. Fica desligada no modo demonstração —
          não existe versão sintética do texto de uma pessoa de verdade.
        </p>
      </div>
    );
  }

  if (linhas === null) return <div className="cartao"><p className="suave">Carregando…</p></div>;

  const lista = linhas.filter((x) => x.status === aba);
  const contar = (id) => linhas.filter((x) => x.status === id).length;

  return (
    <div>
      <div className="cartao">
        <h2>Depoimentos do site</h2>
        <p className="suave">
          O que as clientes escreveram na página. <b>Só aparece no site depois que você
          publica.</b> O WhatsApp de quem escreveu fica só aqui — o site nunca mostra.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {ABAS.map((a) => (
            <button key={a.id} className={aba === a.id ? "btn" : "btn vazio"} onClick={() => setAba(a.id)}>
              {a.label} ({contar(a.id)})
            </button>
          ))}
          <button className="btn vazio" onClick={carregar}>Atualizar</button>
        </div>
      </div>

      {erro && (
        <div className="cartao" style={{ borderColor: "#c9a0a0" }}>
          <b>Não consegui ler os depoimentos.</b>
          <p className="suave" style={{ margin: "6px 0 0" }}>
            {erro} — se fala de permissão, este login não está na lista de operadores.
            Isso não quer dizer que não há depoimentos: quer dizer que este login não pode vê-los.
          </p>
        </div>
      )}

      {!erro && lista.length === 0 && (
        <div className="cartao"><p className="suave" style={{ margin: 0 }}>Nada aqui por enquanto.</p></div>
      )}

      {lista.map((d) => (
        <div className="cartao" key={d.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: "1.05rem" }}>{d.primeiro_nome}</b>
              {d.servico && <span className="suave" style={{ marginLeft: 8 }}>{d.servico}</span>}
              {d.idioma !== "pt" && (
                <span className="suave" style={{ marginLeft: 8 }}>
                  · escreveu em {d.idioma === "en" ? "inglês" : "espanhol"}
                </span>
              )}
            </div>
            <span style={{ color: "#B08D57", letterSpacing: 2 }}>{estrelas(d.nota)}</span>
          </div>

          <p style={{ margin: "10px 0", fontSize: "1.02rem", lineHeight: 1.55 }}>“{d.texto}”</p>

          <p className="suave" style={{ margin: "0 0 10px", fontSize: ".88rem" }}>
            {new Date(d.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            {d.contato ? ` · contato: ${d.contato}` : " · sem contato"}
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {d.status !== "publicado" && (
              <button className="btn" onClick={() => decidir(d.id, "publicado")}>Publicar no site</button>
            )}
            {d.status === "publicado" && (
              <button className="btn vazio" onClick={() => decidir(d.id, "novo")}>Tirar do site</button>
            )}
            {d.status !== "recusado" && (
              <button className="btn vazio" onClick={() => decidir(d.id, "recusado")}>Recusar</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
