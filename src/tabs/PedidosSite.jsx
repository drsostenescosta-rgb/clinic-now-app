// Pedidos do site — a caixa de entrada de quem preencheu o formulário em
// site-andreia-carvalho.vercel.app/#agendar.
//
// A tabela `andreia_pedidos_site` é escrita-cega: o site (chave anônima) só consegue INSERT.
// Ler exige estar em `andreia_operadores`. Se esta tela vier vazia num login que deveria
// enxergar, o problema é a allowlist, não a query — e a mensagem abaixo diz isso, em vez de
// mostrar "nenhum pedido" e deixar a Andreia achar que ninguém a procurou.
//
// Esta tela NÃO envia mensagem. Marcar "contatado" é um registro do que ela já fez pelo
// WhatsApp dela, não um gatilho de envio.
import { useCallback, useEffect, useState } from "react";
import { supabase, MODO } from "../supabase.js";

const TABELA = "andreia_pedidos_site";

const PERIODO = { manha: "manhã", tarde: "tarde", noite: "noite", qualquer: "tanto faz" };
const STATUS = [
  { id: "novo", label: "Novo", cor: "#8A6A43" },
  { id: "contatado", label: "Já falei", cor: "#2f6b45" },
  { id: "agendado", label: "Agendado", cor: "#2f6b45" },
  { id: "descartado", label: "Descartado", cor: "#8a8178" },
];

function diaLegivel(iso) {
  // `iso` é um DATE puro (YYYY-MM-DD). new Date("2026-08-20") é interpretado como UTC e, em
  // Massachusetts, volta um dia — por isso a data é montada em partes.
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

function zapLink(contato, nome) {
  const num = String(contato).replace(/\D/g, "");
  const texto = `Oi, ${nome}! Aqui é a Andréia. Vi seu pedido de horário no site 😊`;
  return `https://wa.me/${num.length === 10 ? "1" + num : num}?text=${encodeURIComponent(texto)}`;
}

export default function PedidosSite() {
  const [pedidos, setPedidos] = useState(null);
  const [erro, setErro] = useState("");
  const [mostrarFechados, setMostrarFechados] = useState(false);

  const carregar = useCallback(async () => {
    setErro("");
    const { data, error } = await supabase
      .from(TABELA)
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(200);
    if (error) {
      setErro(error.message);
      setPedidos([]);
      return;
    }
    setPedidos(data || []);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function decidir(id, status) {
    // Otimista na tela, mas se o banco recusar a linha volta ao que era — em vez de a Andreia
    // achar que marcou algo que não foi marcado.
    const antes = pedidos;
    setPedidos((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase
      .from(TABELA)
      .update({ status, decidido_em: new Date().toISOString() })
      .eq("id", id);
    if (error) { setPedidos(antes); setErro(error.message); }
  }

  if (MODO === "synthetic") {
    return (
      <div className="cartao">
        <h2>Pedidos do site</h2>
        <p className="suave">
          Esta aba lê pedidos reais de clientes. Ela fica desligada no modo demonstração de
          propósito — não existe versão sintética de nome e telefone de gente de verdade.
        </p>
      </div>
    );
  }

  if (pedidos === null) return <div className="cartao"><p className="suave">Carregando…</p></div>;

  const abertos = pedidos.filter((p) => p.status === "novo" || p.status === "contatado");
  const fechados = pedidos.filter((p) => p.status === "agendado" || p.status === "descartado");
  const lista = mostrarFechados ? fechados : abertos;

  return (
    <div>
      <div className="cartao">
        <h2>Pedidos do site</h2>
        <p className="suave">
          Quem preencheu o formulário em <b>andreiacarvalho</b> e está esperando você confirmar
          o horário. Nada foi respondido automaticamente — quem fala com a cliente é você.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className={!mostrarFechados ? "btn" : "btn vazio"} onClick={() => setMostrarFechados(false)}>
            Em aberto ({abertos.length})
          </button>
          <button className={mostrarFechados ? "btn" : "btn vazio"} onClick={() => setMostrarFechados(true)}>
            Resolvidos ({fechados.length})
          </button>
          <button className="btn vazio" onClick={carregar}>Atualizar</button>
        </div>
      </div>

      {erro && (
        <div className="cartao" style={{ borderColor: "#c9a0a0" }}>
          <b>Não consegui ler os pedidos.</b>
          <p className="suave" style={{ margin: "6px 0 0" }}>
            {erro} — se a mensagem fala de permissão, o e-mail deste login não está na lista de
            operadores. Isso não significa que não há pedidos: significa que este login não pode vê-los.
          </p>
        </div>
      )}

      {!erro && lista.length === 0 && (
        <div className="cartao">
          <p className="suave" style={{ margin: 0 }}>
            {mostrarFechados ? "Nenhum pedido resolvido ainda." : "Nenhum pedido em aberto."}
          </p>
        </div>
      )}

      {lista.map((p) => (
        <div className="cartao" key={p.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: "1.1rem" }}>{p.primeiro_nome}</b>
              <span className="suave" style={{ marginLeft: 8 }}>
                {new Date(p.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                {p.idioma !== "pt" && ` · fala ${p.idioma === "en" ? "inglês" : "espanhol"}`}
              </span>
            </div>
            <span style={{ color: STATUS.find((s) => s.id === p.status)?.cor, fontWeight: 600 }}>
              {STATUS.find((s) => s.id === p.status)?.label}
            </span>
          </div>

          <p style={{ margin: "10px 0 4px" }}>
            Quer <b>{p.servico}</b> — {diaLegivel(p.dia_preferido)}, de {PERIODO[p.periodo]}.
          </p>
          {p.observacao && <p className="suave" style={{ margin: "0 0 4px" }}>“{p.observacao}”</p>}

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <a className="btn" href={zapLink(p.contato, p.primeiro_nome)} target="_blank" rel="noopener">
              Falar no WhatsApp
            </a>
            {p.status === "novo" && (
              <button className="btn vazio" onClick={() => decidir(p.id, "contatado")}>Já falei com ela</button>
            )}
            <button className="btn vazio" onClick={() => decidir(p.id, "agendado")}>Agendei</button>
            <button className="btn vazio" onClick={() => decidir(p.id, "descartado")}>Descartar</button>
          </div>
        </div>
      ))}
    </div>
  );
}
