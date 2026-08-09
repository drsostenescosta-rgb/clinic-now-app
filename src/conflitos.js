// Detecção de conflito de horário (anti-overbooking).
// Fonte de verdade: o banco — a checagem consulta o Supabase na hora de salvar,
// para pegar conflitos mesmo fora da semana carregada na grade.
import { supabase } from "./supabase.js";

export function duracaoDaConsulta(consulta, servicos) {
  const s = servicos.find((x) => x.id === consulta.servico_id);
  return s?.duracao_min || 60;
}

export function faixaHorario(consulta, servicos) {
  const ini = new Date(consulta.inicio);
  const fim = new Date(ini.getTime() + duracaoDaConsulta(consulta, servicos) * 60000);
  const f = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${f(ini)}–${f(fim)}`;
}

// Devolve as consultas ativas (não canceladas) que sobrepõem [inicio, inicio+duracaoMin).
// ignorarId: ao editar, a própria consulta não conta como conflito.
export async function buscarConflitos({ inicio, duracaoMin, servicos, ignorarId = null }) {
  const ini = inicio.getTime();
  if (isNaN(ini)) return [];
  const fim = ini + duracaoMin * 60000;
  // Janela: consultas que começam até 6h antes ainda podem estar em andamento
  // (maior serviço do catálogo tem 75 min — 6h dá folga para catálogos futuros).
  const { data, error } = await supabase
    .from("clinicnow_consultas")
    .select("*")
    .gte("inicio", new Date(ini - 6 * 3600000).toISOString())
    .lt("inicio", new Date(fim).toISOString())
    .neq("status", "cancelada");
  if (error) throw new Error(error.message);
  return (data || []).filter((c) => {
    if (ignorarId && c.id === ignorarId) return false;
    const cIni = new Date(c.inicio).getTime();
    const cFim = cIni + duracaoDaConsulta(c, servicos) * 60000;
    return cIni < fim && ini < cFim;
  });
}

// Layout lado a lado (estilo Google Calendar): para as consultas de um dia,
// devolve Map(id → { col, cols }) — eventos que se sobrepõem dividem a largura.
export function colunasDoDia(consultas, servicos) {
  const eventos = consultas
    .map((c) => {
      const ini = new Date(c.inicio).getTime();
      return { id: c.id, ini, fim: ini + duracaoDaConsulta(c, servicos) * 60000 };
    })
    .sort((a, b) => a.ini - b.ini || a.fim - b.fim);

  const resultado = new Map();
  let grupo = []; // grupo de sobreposição transitiva
  let fimGrupo = -Infinity;
  let fimColunas = []; // fim do último evento alocado em cada coluna

  const fecharGrupo = () => {
    for (const ev of grupo) resultado.set(ev.id, { col: ev.col, cols: fimColunas.length });
  };

  for (const ev of eventos) {
    if (grupo.length && ev.ini >= fimGrupo) {
      fecharGrupo();
      grupo = [];
      fimColunas = [];
      fimGrupo = -Infinity;
    }
    let col = 0;
    while (fimColunas[col] > ev.ini) col++;
    ev.col = col;
    fimColunas[col] = ev.fim;
    grupo.push(ev);
    fimGrupo = Math.max(fimGrupo, ev.fim);
  }
  fecharGrupo();
  return resultado;
}
