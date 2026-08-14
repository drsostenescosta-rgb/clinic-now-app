import { createClient } from "@supabase/supabase-js";
import { criarSupabaseSintetico } from "./localSupabase.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;
export const MODO = import.meta.env.VITE_CLINICNOW_MODE === "owner" ? "owner" : "synthetic";
export const OWNER_CONFIG_ERROR = MODO === "owner" && (!url || !key)
  ? "Modo owner selecionado, mas VITE_SUPABASE_URL/VITE_SUPABASE_KEY não foram configurados. Nenhum backend sintético será usado como substituto."
  : "";

// Sintético é o padrão e não faz rede. Owner só existe com sessão autenticada,
// RLS e a RPC transacional aplicada pela dona no projeto correto.
const indisponivel = {
  auth: { async getSession() { return { data: { session: null }, error: new Error(OWNER_CONFIG_ERROR) }; }, onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; }, async signInWithPassword() { return { error: new Error(OWNER_CONFIG_ERROR) }; }, async signOut() { return { error: null }; } },
  from() { throw new Error(OWNER_CONFIG_ERROR); }, async rpc() { return { data: null, error: new Error(OWNER_CONFIG_ERROR) }; },
};
export const supabase = MODO === "synthetic" ? criarSupabaseSintetico() : OWNER_CONFIG_ERROR ? indisponivel : createClient(url, key);

export async function reservarConsulta({ paciente_nome, servico_id, inicio, origem = "manual" }) {
  const { data, error } = await supabase.rpc("reservar_consulta", { p_paciente_nome: paciente_nome, p_servico_id: servico_id, p_inicio: new Date(inicio).toISOString(), p_origem: origem });
  if (error) throw new Error(error.message || "Não foi possível reservar o horário.");
  if (!data?.ok) { const erro = new Error(data?.code === "conflito" ? "Este horário acabou de ser ocupado. Escolha outro horário." : data?.code === "pii_bloqueada" ? "Use somente alias sintético no formato Paciente Demo 01." : "Reserva recusada."); erro.code = data?.code; erro.conflitos = data?.conflitos || []; throw erro; }
  return data.consulta;
}

export async function criarPaciente({ nome, telefone = null, drive_url = null }) {
  const { data, error } = await supabase.rpc("criar_paciente", { p_nome: nome, p_telefone: telefone, p_drive_url: drive_url });
  if (error) throw new Error(error.message || "Não foi possível criar o paciente.");
  if (!data?.ok) throw new Error(data?.code === "pii_bloqueada" ? "No modo sintético, use apenas Paciente Demo 01 e não informe telefone/Drive." : "Paciente recusado.");
  return data.paciente;
}

export async function atualizarConsulta({ id, servico_id, inicio, tip_usd, status }) {
  const { data, error } = await supabase.rpc("atualizar_consulta", { p_consulta_id: id, p_servico_id: servico_id, p_inicio: new Date(inicio).toISOString(), p_tip_usd: Number(tip_usd) || 0, p_status: status });
  if (error) throw new Error(error.message || "Não foi possível atualizar a consulta.");
  if (!data?.ok) { const erro = new Error(data?.code === "conflito" ? "Este horário está ocupado. Escolha outro." : "Atualização recusada."); erro.code = data?.code; erro.conflitos = data?.conflitos || []; throw erro; }
  return data.consulta;
}

// ---- Catálogo (fonte de verdade: tabela clinicnow_servicos) ----

let _servicos = null;
export async function carregarServicos(force = false) {
  if (_servicos && !force) return _servicos;
  const { data, error } = await supabase
    .from("clinicnow_servicos")
    .select("*")
    .order("categoria")
    .order("nome");
  if (error) throw new Error(error.message);
  _servicos = data;
  return data;
}
export function invalidarServicos() {
  _servicos = null;
}

// Normaliza acentos/caixa para casar o serviço citado pela Emily com o catálogo.
function norm(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
export function acharServico(servicos, nome) {
  const n = norm(nome);
  return (
    servicos.find((s) => norm(s.nome) === n || norm(s.nome_en) === n) ||
    servicos.find((s) => norm(s.nome).includes(n) || n.includes(norm(s.nome))) ||
    null
  );
}

export function fmtUSD(v) {
  if (v === null || v === undefined || v === "") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));
}

// Cores por categoria de serviço (blocos da agenda)
export const CORES_CATEGORIA = {
  massagem: "#0284c7",
  terapias: "#7c3aed",
  estetica: "#db2777",
  corporal: "#d97706",
};
export function corDoServico(servicos, consulta) {
  const s =
    (consulta.servico_id && servicos.find((x) => x.id === consulta.servico_id)) ||
    acharServico(servicos, consulta.servico);
  return CORES_CATEGORIA[s?.categoria] || "#0f766e";
}
