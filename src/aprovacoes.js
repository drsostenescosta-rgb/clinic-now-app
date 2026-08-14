// aprovacoes.js — cliente da ponte de aprovação (medgrowth/emily-vendas/api.mjs).
//
// Duas fontes, na ordem:
//   1. PONTE  — quando VITE_APROVACOES_API está definida, a fila vem do motor de regras ao vivo
//               e as decisões vão para o ledger append-only.
//   2. DEMO   — sem a ponte, o painel carrega `src/demo/fila-andreia.json`, que é uma GRAVAÇÃO
//               do mesmo motor rodando os cinco cenários (regenerável com
//               `npm run shadow:andreia -- --exportar`). Nenhuma resposta da demo foi escrita
//               à mão: é a regra decidindo. As decisões em modo demo ficam só na tela e o
//               painel diz isso — não existe ledger sem ponte.
//
// O painel NUNCA envia mensagem. Não existe função de envio aqui, de propósito.

import filaDemo from "./demo/fila-andreia.json";

export const API = import.meta.env.VITE_APROVACOES_API || "";
export const TEM_PONTE = Boolean(API);

const OPERADOR_CHAVE = "clinicnow.aprovador";

export function lerAprovador() {
  try {
    return localStorage.getItem(OPERADOR_CHAVE) || "";
  } catch {
    return "";
  }
}

export function salvarAprovador(nome) {
  try {
    localStorage.setItem(OPERADOR_CHAVE, String(nome || "").trim());
  } catch {
    /* sem storage, o nome só vale nesta sessão */
  }
}

async function chamar(caminho, { method = "GET", corpo = null, aprovador = "" } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (aprovador) headers["X-ClinicNow-Operador"] = aprovador;
  const res = await fetch(`${API}${caminho}`, {
    method,
    headers,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dados.erro || `ponte respondeu ${res.status}`);
  return dados;
}

// ---------------------------------------------------------------- estado
export async function carregarEstado() {
  if (!TEM_PONTE) {
    return {
      modo: "demo",
      clinica: filaDemo.clinica,
      servicos: filaDemo.servicos,
      gate: {
        preflight_aprovado: false,
        modo_sintetico: true,
        grade_definida: false,
        tom_validado: false,
        pendencias_abertas: [
          "2.3 — grade de horários semanais (AM/PM ambíguo)",
          "6.5 — três respostas-modelo no tom da Andreia",
          "9.1/9.2 — exemplos anonimizados",
          "7.3 — política de retenção",
          "4.6 — sinal e lista de espera",
        ],
      },
      ledger: null,
      aviso_demo: "Fila gravada do motor de regras. Sem a ponte ligada, as decisões não vão para o ledger.",
    };
  }
  const e = await chamar("/api/estado");
  return { modo: "ponte", ...e };
}

export async function carregarFila() {
  if (!TEM_PONTE) return filaDemo.fila;
  const { fila } = await chamar("/api/fila");
  return fila;
}

/**
 * Entra uma mensagem REAL na fila. Só existe com a ponte ligada — é o motor que decide,
 * e é o ledger que registra. Sem ponte, o painel é demonstração e não aceita mensagem nova.
 */
export async function criarProposta({ alias, mensagem, contexto = {}, aprovador }) {
  if (!TEM_PONTE) throw new Error("sem a ponte ligada o painel é só demonstração — suba `npm run api:operacao`");
  return chamar("/api/proposta", { method: "POST", aprovador, corpo: { canal: "whatsapp", alias, mensagem, contexto } });
}

export async function enviarDecisao({ id, decisao, aprovador, texto_original, texto_final, motivo_da_decisao }) {
  if (!TEM_PONTE) {
    // Em demo a decisão é local e o painel deixa isso explícito na tela.
    return { ok: true, demo: true, lembrete: "Decisão registrada só nesta tela (modo demo, sem ledger)." };
  }
  return chamar("/api/decisao", {
    method: "POST",
    aprovador,
    corpo: { id, decisao, texto_original, texto_final, motivo_da_decisao },
  });
}

// ---------------------------------------------------------------- apresentação
export const ROTULO_ACAO = {
  responder: { texto: "Responder", cor: "#0f766e" },
  reperguntar_confirmacao: { texto: "Reperguntar", cor: "#b45309" },
  escalar: { texto: "Escalar para a Andreia", cor: "#b91c1c" },
  bloquear: { texto: "Bloqueado por conflito", cor: "#7c2d12" },
};

export const ROTULO_RELACAO = {
  nova: "cliente nova",
  conhecida: "já veio antes",
  de_casa: "cliente de casa",
};

export const ROTULO_AGENDA = {
  nenhuma: "nenhuma alteração na agenda",
  marcar: "propõe marcar",
  coletar_preferencia: "anota a preferência, sem confirmar",
  propor_horario: "propõe horários",
  bloqueada_por_conflito: "bloqueada — conflito na agenda",
};

/** Copiar é a única "saída" do painel: o envio continua sendo humano, no WhatsApp. */
export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}
