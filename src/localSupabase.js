import { conflitoComAgenda, terminaEm } from "./scheduling.js";
import { validarAliasSintetico } from "./syntheticPolicy.js";

export const CHAVE_SYNTHETIC = "clinicnow.synthetic.v3";
export const CHAVE_QUARENTENA = "clinicnow.synthetic.quarantine.v3";
const CHAVES_LEGADAS = ["clinicnow.synthetic.v2"];
const clinicId = "00000000-0000-4000-8000-000000000001";
// Catálogo REAL da Andréia Carvalho Aesthetics (questionário de 11/08/2026). Preço, duração e
// buffer de serviço são dados de NEGÓCIO, não de paciente — podem viver aqui. Os pacientes
// continuam sendo só aliases sintéticos, e é isso que a política de PII protege.
// Fonte única: ~/Applications/clinic-now-piloto-familia/config/operacao-assistida.json
export const SEED_SYNTHETIC = {
  clinicnow_servicos: [
    { id: "svc-drenagem", clinic_id: clinicId, nome: "Drenagem linfática", nome_en: "Lymphatic drainage", categoria: "massagem", preco_usd: 60, duracao_min: 50, buffer_min: 10 },
    { id: "svc-pos-operatorio", clinic_id: clinicId, nome: "Pós-operatório", nome_en: "Post-operative care", categoria: "terapias", preco_usd: 100, duracao_min: 80, buffer_min: 10 },
    { id: "svc-massoterapia-masculina", clinic_id: clinicId, nome: "Massoterapia masculina", nome_en: "Men's massage therapy", categoria: "massagem", preco_usd: 70, duracao_min: 50, buffer_min: 10 },
  ], clinicnow_pacientes: [], clinicnow_consultas: [],
};

function somenteChaves(registro, permitidas) { return registro && Object.keys(registro).every((k) => permitidas.has(k)); }
const CHAVES_SERVICO = new Set(["id","clinic_id","nome","nome_en","categoria","preco_usd","duracao_min","buffer_min"]);
const CHAVES_PACIENTE = new Set(["id","clinic_id","nome","telefone","drive_url","criado_em"]);
const CHAVES_CONSULTA = new Set(["id","clinic_id","paciente_nome","servico_id","servico","preco_usd","duracao_snapshot_min","buffer_snapshot_min","inicio","termina_em","origem","status","criado_em","tip_usd","google_event_id"]);

export function validarEstadoSintetico(db) {
  if (!db || !Array.isArray(db.clinicnow_servicos) || !Array.isArray(db.clinicnow_pacientes) || !Array.isArray(db.clinicnow_consultas)) return false;
  if (!db.clinicnow_servicos.every((s) => somenteChaves(s,CHAVES_SERVICO) && typeof s.id === "string" && typeof s.nome === "string" && Number.isFinite(Number(s.preco_usd)) && Number.isInteger(s.duracao_min) && s.duracao_min > 0 && Number.isInteger(s.buffer_min) && s.buffer_min >= 0)) return false;
  if (!db.clinicnow_pacientes.every((p) => somenteChaves(p,CHAVES_PACIENTE) && typeof p.id === "string" && validarAliasSintetico(p.nome) && !p.telefone && !p.drive_url)) return false;
  return db.clinicnow_consultas.every((c) => {
    if (!somenteChaves(c,CHAVES_CONSULTA) || typeof c.id !== "string" || typeof c.servico_id !== "string" || !validarAliasSintetico(c.paciente_nome) || !["agendada", "concluida", "cancelada"].includes(c.status)) return false;
    if (!Number.isInteger(c.duracao_snapshot_min) || c.duracao_snapshot_min <= 0 || !Number.isInteger(c.buffer_snapshot_min) || c.buffer_snapshot_min < 0) return false;
    try { return terminaEm(c.inicio, c.duracao_snapshot_min, c.buffer_snapshot_min) === c.termina_em; } catch { return false; }
  });
}

function registrarQuarentena(storage, motivo) {
  storage.setItem(CHAVE_QUARENTENA, JSON.stringify({ em: new Date().toISOString(), motivo, conteudo_preservado: false }));
}

export function inicializarEstadoSintetico(storage = globalThis.localStorage) {
  let legado = false;
  for (const chave of CHAVES_LEGADAS) if (storage.getItem(chave) !== null) { storage.removeItem(chave); legado = true; }
  const bruto = storage.getItem(CHAVE_SYNTHETIC);
  if (bruto === null) { if (legado) registrarQuarentena(storage, "estado legado v2 removido sem exibição"); return structuredClone(SEED_SYNTHETIC); }
  try {
    const db = JSON.parse(bruto);
    if (validarEstadoSintetico(db)) return db;
  } catch { /* cai em limpeza segura */ }
  storage.removeItem(CHAVE_SYNTHETIC);
  registrarQuarentena(storage, "estado v3 inválido removido sem preservar PII");
  return structuredClone(SEED_SYNTHETIC);
}

function ler() { return inicializarEstadoSintetico(); }
function gravar(db) { if (!validarEstadoSintetico(db)) throw new Error("Estado sintético recusado pela política de PII/consistência."); localStorage.setItem(CHAVE_SYNTHETIC, JSON.stringify(db)); }
function id(prefix) { return `${prefix}-${crypto.randomUUID()}`; }

class Query {
  constructor(tabela) { this.tabela = tabela; this.filtros = []; this.ordem = null; this.operacao = "select"; this.payload = null; this.expectSingle = false; }
  select() { return this; } insert(p) { this.operacao = "insert"; this.payload = p; return this; } update(p) { this.operacao = "update"; this.payload = p; return this; }
  eq(c, v) { this.filtros.push((x) => x[c] === v); return this; } neq(c, v) { this.filtros.push((x) => x[c] !== v); return this; }
  gte(c, v) { this.filtros.push((x) => x[c] >= v); return this; } lt(c, v) { this.filtros.push((x) => x[c] < v); return this; }
  order(c, op = {}) { this.ordem = { c, asc: op.ascending !== false }; return this; } single() { this.expectSingle = true; return this; }
  then(resolve, reject) { return this.executar().then(resolve, reject); }
  async executar() {
    const db = ler(); const linhas = db[this.tabela] || []; const escolhidas = linhas.filter((x) => this.filtros.every((f) => f(x)));
    if (this.operacao === "select") { const data = [...escolhidas]; if (this.ordem) data.sort((a,b) => (a[this.ordem.c] > b[this.ordem.c] ? 1 : -1) * (this.ordem.asc ? 1 : -1)); return { data: this.expectSingle ? data[0] || null : data, error: null }; }
    if (this.operacao === "insert") { const base = Array.isArray(this.payload) ? this.payload : [this.payload]; const data = base.map((x) => ({ ...x, id: x.id || id(this.tabela), clinic_id: clinicId, criado_em: new Date().toISOString() })); db[this.tabela] = [...linhas, ...data]; gravar(db); return { data: this.expectSingle ? data[0] : data, error: null }; }
    const data = escolhidas.map((x) => Object.assign(x, this.payload)); gravar(db); return { data: this.expectSingle ? data[0] : data, error: null };
  }
}

export function criarSupabaseSintetico() { return { from: (tabela) => new Query(tabela), auth: { async getSession() { return { data: { session: null }, error: null }; }, onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; }, async signOut() { return { error: null }; } }, async rpc(nome, args) {
  const db = ler();
  if (nome === "criar_paciente") { if (!validarAliasSintetico(args.p_nome) || args.p_telefone || args.p_drive_url) return { data: { ok:false, code:"pii_bloqueada" }, error:null }; const paciente={ id:id("paciente"),clinic_id:clinicId,nome:args.p_nome.trim(),telefone:null,drive_url:null,criado_em:new Date().toISOString() }; db.clinicnow_pacientes.push(paciente); gravar(db); return { data:{ok:true,paciente},error:null }; }
  if (nome === "atualizar_consulta") { const c=db.clinicnow_consultas.find((x)=>x.id===args.p_consulta_id); const s=db.clinicnow_servicos.find((x)=>x.id===args.p_servico_id); if(!c||!s||!["agendada","concluida","cancelada"].includes(args.p_status)) return {data:{ok:false,code:"consulta_invalida"},error:null}; const conflitos=args.p_status==="cancelada"?[]:conflitoComAgenda(db.clinicnow_consultas,args.p_inicio,s.duracao_min,s.buffer_min,c.id); if(conflitos.length)return{data:{ok:false,code:"conflito",conflitos},error:null}; Object.assign(c,{servico_id:s.id,servico:s.nome,preco_usd:s.preco_usd,duracao_snapshot_min:s.duracao_min,buffer_snapshot_min:s.buffer_min,inicio:new Date(args.p_inicio).toISOString(),termina_em:terminaEm(args.p_inicio,s.duracao_min,s.buffer_min),tip_usd:Math.max(Number(args.p_tip_usd)||0,0),status:args.p_status}); gravar(db); return{data:{ok:true,consulta:c},error:null}; }
  if(nome!=="reservar_consulta")return{data:null,error:new Error("RPC sintética desconhecida")}; if(!validarAliasSintetico(args.p_paciente_nome))return{data:{ok:false,code:"pii_bloqueada"},error:null}; const s=db.clinicnow_servicos.find((x)=>x.id===args.p_servico_id); if(!s)return{data:{ok:false,code:"servico_invalido"},error:null}; const conflitos=conflitoComAgenda(db.clinicnow_consultas,args.p_inicio,s.duracao_min,s.buffer_min); if(conflitos.length)return{data:{ok:false,code:"conflito",conflitos},error:null}; const consulta={id:id("consulta"),clinic_id:clinicId,paciente_nome:args.p_paciente_nome,servico_id:s.id,servico:s.nome,preco_usd:s.preco_usd,duracao_snapshot_min:s.duracao_min,buffer_snapshot_min:s.buffer_min,inicio:new Date(args.p_inicio).toISOString(),termina_em:terminaEm(args.p_inicio,s.duracao_min,s.buffer_min),origem:args.p_origem||"manual",status:"agendada",criado_em:new Date().toISOString()}; db.clinicnow_consultas.push(consulta); gravar(db); return{data:{ok:true,consulta},error:null};
} }; }
