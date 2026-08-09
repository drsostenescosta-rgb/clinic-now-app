import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(url, key);

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
