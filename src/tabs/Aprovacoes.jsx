import React, { useEffect, useMemo, useState } from "react";
import {
  ROTULO_ACAO,
  ROTULO_AGENDA,
  ROTULO_RELACAO,
  TEM_PONTE,
  carregarEstado,
  carregarFila,
  copiar,
  criarProposta,
  enviarDecisao,
  lerAprovador,
  salvarAprovador,
} from "../aprovacoes.js";

// Painel de Aprovação — a fila onde a mensagem da cliente chega, a Emily propõe, e um humano
// decide. A promessa da Fase 1 é uma só e está escrita na tela: NADA SAI SEM CLIQUE.
// Aprovar aqui não envia mensagem nenhuma; libera o texto para a pessoa colar no WhatsApp.

export default function Aprovacoes() {
  const [estado, setEstado] = useState(null);
  const [fila, setFila] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aprovador, setAprovador] = useState(lerAprovador());
  const [decididos, setDecididos] = useState({});

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [e, f] = await Promise.all([carregarEstado(), carregarFila()]);
        if (!ativo) return;
        setEstado(e);
        setFila(f);
      } catch (e) {
        if (ativo) setErro(String(e?.message || e));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const pendentes = useMemo(() => fila.filter((p) => !decididos[p.id]), [fila, decididos]);

  async function recarregar() {
    const [e, f] = await Promise.all([carregarEstado(), carregarFila()]);
    setEstado(e);
    setFila(f);
  }

  function aoDecidir(id, registro) {
    setDecididos((d) => ({ ...d, [id]: registro }));
    // Recarrega o estado depois de decidir. Sem isto o contador do ledger ficava parado no
    // número anterior — e esse contador é justamente o que diz à Andreia que a decisão dela foi
    // registrada. Visto rodando na nuvem: o evento estava gravado no banco e a tela dizia
    // "1 evento" depois de dois. Painel de auditoria que mostra número velho não audita nada.
    // O catch é silencioso de propósito: a decisão JÁ foi gravada, e falhar o refresh não pode
    // pintar de vermelho uma operação que deu certo.
    recarregar().catch(() => {});
  }

  if (carregando) return <div className="painel"><p className="sub">Carregando a fila…</p></div>;
  if (erro) {
    return (
      <div className="painel">
        <h2>Painel de Aprovação</h2>
        <p className="erro">Não consegui falar com a ponte de aprovação: {erro}</p>
        <p className="sub">
          Suba a ponte com <code>npm run api</code> em <code>~/Applications/medgrowth</code>, ou rode o painel sem
          <code> VITE_APROVACOES_API</code> para ver a fila de demonstração.
        </p>
      </div>
    );
  }

  const gate = estado?.gate || {};

  return (
    <div className="painel">
      <div className="aprov-cabecalho">
        <div>
          <h2>Painel de Aprovação</h2>
          <p className="sub">
            {estado?.clinica || "Clínica"} · {pendentes.length} mensagem(ns) esperando você
          </p>
        </div>
        <span className={TEM_PONTE ? "selo" : "selo selo-demo"}>{TEM_PONTE ? "ponte ligada" : "demonstração"}</span>
      </div>

      {/* A promessa central do piloto, sempre visível — não é rodapé. */}
      <div className="aprov-promessa">
        <strong>Nada é enviado automaticamente.</strong> Aprovar libera o texto para você copiar e colar no WhatsApp.
        O envio continua sendo seu.
      </div>

      <Gate gate={gate} modo={estado?.modo} aviso={estado?.aviso_demo} ledger={estado?.ledger} />

      {TEM_PONTE && (
        <Composer aprovador={aprovador} aoCriar={recarregar} protecao={estado?.gate?.protecao_dados || ""} />
      )}

      <label className="campo-rotulado aprov-quem">
        <span>Quem está aprovando agora</span>
        <input
          value={aprovador}
          onChange={(e) => {
            setAprovador(e.target.value);
            salvarAprovador(e.target.value);
          }}
          placeholder="Andreia ou Sostenes"
          aria-label="Nome de quem está aprovando"
        />
      </label>

      {pendentes.length === 0 && (
        <p className="sub aprov-vazio">Fila zerada. Nada esperando aprovação. ✅</p>
      )}

      <div className="aprov-lista">
        {pendentes.map((item) => (
          <Cartao key={item.id} item={item} aprovador={aprovador} aoDecidir={aoDecidir} />
        ))}
      </div>

      {Object.keys(decididos).length > 0 && <Decididos fila={fila} decididos={decididos} />}
    </div>
  );
}

// ---------------------------------------------------------------- entrada de mensagem real
/**
 * Só aparece com a ponte ligada. É por aqui que a operação deixa de ser ensaio: a mensagem que
 * chegou no WhatsApp dela é colada aqui, o motor de regras decide, e a proposta entra na fila.
 */
function Composer({ aprovador, aoCriar, protecao }) {
  const [alias, setAlias] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [servico, setServico] = useState("");
  const [anteriores, setAnteriores] = useState("");
  const [aguardando, setAguardando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(e) {
    e.preventDefault();
    if (!aprovador.trim()) return setErro("Escreva seu nome em \"Quem está aprovando agora\" antes.");
    if (!alias.trim() || !mensagem.trim()) return setErro("Preciso do apelido da cliente e da mensagem.");
    setOcupado(true);
    setErro("");
    try {
      await criarProposta({
        alias: alias.trim(),
        mensagem: mensagem.trim(),
        aprovador: aprovador.trim(),
        contexto: {
          primeiro_nome: alias.trim().split(/\s+/)[0],
          atendimentos_anteriores: Number(anteriores) || 0,
          servico: servico || undefined,
          aguardando_confirmacao: aguardando,
        },
      });
      setMensagem("");
      await aoCriar();
    } catch (e2) {
      setErro(String(e2?.message || e2));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form className="aprov-composer" onSubmit={enviar}>
      <h3>Chegou mensagem no WhatsApp</h3>
      <p className="sub">{protecao}</p>
      <div className="aprov-composer-linha">
        <label className="campo-rotulado">
          <span>Como você chama a cliente</span>
          <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Bia" />
        </label>
        <label className="campo-rotulado">
          <span>Sessões anteriores</span>
          <input value={anteriores} onChange={(e) => setAnteriores(e.target.value)} placeholder="0" inputMode="numeric" />
        </label>
        <label className="campo-rotulado">
          <span>Serviço (se souber)</span>
          <input value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Drenagem linfática" />
        </label>
      </div>
      <label className="campo-rotulado">
        <span>O que ela escreveu</span>
        <textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Cole aqui a mensagem, do jeito que chegou" />
      </label>
      <label className="campo-rotulado" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={aguardando} onChange={(e) => setAguardando(e.target.checked)} style={{ width: "auto" }} />
        <span>Estou esperando ela confirmar um horário</span>
      </label>
      {erro && <p className="erro">{erro}</p>}
      <div>
        <button className="botao-confirmar" type="submit" disabled={ocupado}>
          {ocupado ? "Analisando…" : "Ver o que a Emily propõe"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- gate e pendências
function Gate({ gate, modo, aviso, ledger }) {
  const reprovado = !gate.preflight_aprovado;
  const operacao = gate.modo_operacao === true;
  return (
    <div className={reprovado && !operacao ? "aprov-gate reprovado" : "aprov-gate"}>
      <div className="aprov-gate-linha">
        <strong>
          {operacao
            ? "Operação real — texto redigido antes de gravar"
            : reprovado
              ? "Preflight REPROVADO — modo sintético"
              : "Preflight aprovado"}
        </strong>
        {reprovado && !operacao && (
          <span className="sub"> · o sistema só aceita apelidos "Cliente Demo NN"</span>
        )}
        {gate.grade_definida === false && <span className="sub"> · a Emily não oferece horário</span>}
      </div>
      {/* A tela precisa dizer o alcance REAL da proteção no modo em que está. Dizer "modo
          sintético" enquanto se opera de verdade é a tela mentindo sobre si mesma. */}
      {gate.protecao_dados && <p className="sub aprov-limite">{gate.protecao_dados}</p>}
      {!gate.protecao_dados && reprovado && (
        <p className="sub aprov-limite">
          O sistema <strong>recusa</strong> e-mail, telefone, SSN e data de nascimento, e só aceita apelidos sintéticos.
          Ele <strong>não sabe</strong> reconhecer o nome de uma pessoa — não digite dado real de cliente aqui.
        </p>
      )}
      {reprovado && (
        <ul className="aprov-pendencias">
          {(gate.pendencias_abertas || []).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {!gate.tom_validado && (
        <p className="sub">
          ⚠ Os rascunhos estão em tom genérico: as três mensagens no tom da Andreia (pendência 6.5) ainda não chegaram.
          Leia cada texto antes de aprovar.
        </p>
      )}
      {modo === "demo" && aviso && <p className="sub">ℹ {aviso}</p>}
      {ledger && (
        // "íntegra" sem âncora e "íntegra com âncora" são estados muito diferentes, e a versão
        // anterior mostrava a mesma coisa nos dois — inclusive no dia 1, quando não há âncora
        // nenhuma. Sem essa distinção a dona não consegue saber se está protegida.
        <p className="sub">
          Ledger: {ledger.total} evento(s) · cadeia {ledger.ok ? "íntegra ✅" : "QUEBRADA ⚠"}
          {ledger.ancora?.presente === false && (
            <strong className="aprov-sem-ancora"> · âncora ausente ⚠ (sem proteção contra reescrita)</strong>
          )}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- cartão de uma proposta
function Cartao({ item, aprovador, aoDecidir }) {
  const d = item.decisao_motor || {};
  const original = d.resposta_sugerida || "";
  const [texto, setTexto] = useState(original);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);

  const editado = texto.trim() !== original.trim();
  const rotulo = ROTULO_ACAO[d.acao] || { texto: d.acao, cor: "#475569" };

  async function decidir(tipo) {
    if (!aprovador.trim()) {
      setErro("Escreva quem está aprovando antes de decidir — decisão sem nome não é aprovação.");
      return;
    }
    setOcupado(true);
    setErro("");
    // A decisão real precisa viajar junto para a tela — antes o bloco "Decididos agora" imprimia
    // "aprovada" fixo e chamava de aprovada o que tinha sido escalado ou descartado. Num painel
    // cuja única promessa é auditabilidade, a tela contar o contrário do registro é grave.
    const decisaoReal = tipo === "aprovar" ? (editado ? "editada" : "aprovada") : tipo === "escalar" ? "escalada" : "descartada";
    try {
      const resposta = await enviarDecisao({
        id: item.id,
        decisao: decisaoReal,
        aprovador: aprovador.trim(),
        texto_original: original,
        // Descarte não leva texto: nada foi aprovado para enviar.
        texto_final: decisaoReal === "descartada" ? "" : texto,
        motivo_da_decisao: motivo,
      });
      aoDecidir(item.id, { ...resposta, decisao: decisaoReal, texto, editado, aprovador: aprovador.trim() });
    } catch (e) {
      setErro(String(e?.message || e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <article className="aprov-cartao">
      <header className="aprov-cartao-topo">
        <div>
          <strong>{item.primeiro_nome || item.alias}</strong>
          <span className="sub"> · {item.alias} · {ROTULO_RELACAO[d.relacao] || "—"}</span>
        </div>
        <span className="aprov-etiqueta" style={{ background: rotulo.cor }}>{rotulo.texto}</span>
      </header>

      {item.titulo && <p className="aprov-titulo">{item.titulo}</p>}

      <div className="bolha bolha-voce aprov-recebida">{item.mensagem}</div>

      <div className="aprov-porque">
        <span className="aprov-regra">{d.regra}</span>
        <span>{d.motivo}</span>
      </div>

      {(d.bloqueios || []).length > 0 && (
        <ul className="aprov-bloqueios">
          {d.bloqueios.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}

      {(d.alertas || []).length > 0 && (
        <p className="aprov-alerta">{d.alertas.join(" · ")}</p>
      )}

      <p className="aprov-agenda">
        Agenda: <strong>{ROTULO_AGENDA[d.acao_agenda?.tipo] || d.acao_agenda?.tipo}</strong>
        {d.acao_agenda?.detalhe && <span className="sub"> — {d.acao_agenda.detalhe}</span>}
        {d.acao_agenda?.conflitos?.length > 0 && (
          <span className="sub"> — {d.acao_agenda.conflitos.length} compromisso(s) no caminho</span>
        )}
      </p>

      <label className="campo-rotulado">
        <span>Resposta proposta {editado && <em className="aprov-editado">editada por você</em>}</span>
        <textarea
          className="aprov-texto"
          rows={4}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Texto da resposta que será copiado para o WhatsApp"
        />
      </label>

      <label className="campo-rotulado">
        <span>Por que você decidiu assim (opcional, sobre o texto — nunca sobre a cliente)</span>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="ex.: estava formal demais" />
      </label>

      {erro && <p className="erro">{erro}</p>}

      <div className="aprov-acoes">
        <button className="botao-confirmar" disabled={ocupado} onClick={() => decidir("aprovar")}>
          {editado ? "Aprovar com minha edição" : "Aprovar"}
        </button>
        <button className="botao-leve" disabled={ocupado} onClick={() => decidir("escalar")}>
          Escalar para a Andreia
        </button>
        <button className="botao-leve" disabled={ocupado} onClick={() => decidir("descartar")}>
          Descartar
        </button>
        <button
          className="botao-link"
          type="button"
          onClick={async () => {
            setCopiado(await copiar(texto));
            setTimeout(() => setCopiado(false), 2000);
          }}
        >
          {copiado ? "copiado ✅" : "copiar texto"}
        </button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- já decididos nesta sessão
const ROTULO_DECISAO = {
  aprovada: "aprovada",
  editada: "aprovada com edição",
  escalada: "escalada para a Andreia",
  descartada: "descartada",
};

// "escalada para a Andreia por Andreia" é frase de sistema. Quando quem aprova É a responsável
// pela escalada, o que aconteceu foi ela assumir o caso — e é isso que a tela deve dizer.
const RESPONSAVEL = "andreia";
function rotuloDecisao(decisao, aprovador) {
  const ehResponsavel = String(aprovador || "").toLowerCase().includes(RESPONSAVEL);
  if (decisao === "escalada" && ehResponsavel) return "assumida por você";
  return ROTULO_DECISAO[decisao] || decisao;
}

function Decididos({ fila, decididos }) {
  const itens = fila.filter((p) => decididos[p.id]);
  return (
    <section className="aprov-decididos">
      <h3>Decididos agora ({itens.length})</h3>
      {itens.map((p) => {
        const r = decididos[p.id];
        return (
          <div key={p.id} className="aprov-decidido">
            <div>
              <strong>{p.primeiro_nome || p.alias}</strong>
              <span className="sub">
                {" "}
                · <span className={`aprov-tag aprov-tag-${r.decisao}`}>{rotuloDecisao(r.decisao, r.aprovador)}</span>{!(r.decisao === "escalada" && String(r.aprovador || "").toLowerCase().includes(RESPONSAVEL)) && ` por ${r.aprovador}`}
                {r.evento && ` · ledger #${r.evento.seq} (${r.evento.hash.slice(0, 8)}…)`}
                {r.demo && " · modo demo, sem ledger"}
              </span>
            </div>
            <p className="aprov-lembrete">
              {r.decisao === "descartada"
                ? "Descartada. Nenhum texto foi liberado e nada foi enviado."
                : r.decisao === "escalada"
                  ? String(r.aprovador || "").toLowerCase().includes(RESPONSAVEL)
                    ? "Você assumiu esta conversa. A Emily não responde mais aqui até você devolver."
                    : "Escalada para a Andreia. Avise ela agora — a conversa está com o humano."
                  : r.lembrete}
            </p>
            {r.agenda && (
              <p className="sub">
                Agenda: {r.agenda.ok ? "reservada" : `bloqueada — ${r.agenda.motivo}`}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
