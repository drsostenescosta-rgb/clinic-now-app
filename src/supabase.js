import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(url, key);

// Catálogo v0 (fictício, espelha o prompt da Emily). Vira tabela `produtos` na Fase 4.
export const CATALOGO = [
  { servico: "Consulta de avaliação", preco: "R$ 250" },
  { servico: "Limpeza de pele", preco: "R$ 180" },
  { servico: "Sessão de fisioterapia", preco: "R$ 150" },
  { servico: "Retorno (até 30 dias)", preco: "sem custo" },
];
