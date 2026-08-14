import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { conflitoComAgenda, fimDaConsulta, terminaEm } from "../src/scheduling.js";
import { validarAliasSintetico } from "../src/syntheticPolicy.js";
import { criarHandler } from "../server.mjs";
import { CHAVE_QUARENTENA, CHAVE_SYNTHETIC, SEED_SYNTHETIC, inicializarEstadoSintetico, validarEstadoSintetico } from "../src/localSupabase.js";

test("intervalos encostados não conflitam; sobrepostos conflitam", () => {
  const agenda = [{ id: "a", inicio: "2026-08-12T15:00:00.000Z", termina_em: "2026-08-12T16:00:00.000Z", status: "agendada" }];
  assert.equal(conflitoComAgenda(agenda, "2026-08-12T16:00:00.000Z", 60).length, 0);
  assert.equal(conflitoComAgenda(agenda, "2026-08-12T15:30:00.000Z", 30).length, 1);
  assert.equal(terminaEm("2026-08-12T15:00:00.000Z", 75), "2026-08-12T16:15:00.000Z");
  assert.equal(terminaEm("2026-08-12T15:00:00.000Z", 60, 10), "2026-08-12T16:10:00.000Z");
  assert.equal(fimDaConsulta({ inicio:"2026-08-12T15:00:00.000Z", termina_em:"2026-08-12T16:20:00.000Z", duracao_snapshot_min:60, buffer_snapshot_min:10 }), "2026-08-12T16:20:00.000Z");
});

test("modo sintético aceita só alias artificial estrito", () => {
  assert.equal(validarAliasSintetico("Paciente Demo 01"), true);
  for (const valor of ["Andreia", "Paciente 1", "Paciente Demo 1", "+1 617 555 0100", ""]) assert.equal(validarAliasSintetico(valor), false);
});

test("SQL staged é faseado, manual e inclui buffer sem grants de escrita", async () => {
  const [containment, backfill, finalize] = await Promise.all([
    readFile(new URL("../supabase/e2-staged/20260811_001_e2_containment_schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/admin/20260811_002_e2_bootstrap_backfill.psql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/e2-staged/20260811_003_e2_finalize_security.sql", import.meta.url), "utf8"),
  ]);
  for (const trecho of ["add column if not exists clinic_id", "buffer_min integer", "from public, anon, authenticated", "enable row level security"]) assert.match(containment, new RegExp(trecho));
  for (const trecho of [":'owner_id'", ":'clinic_name'", "buffer_min is null", "Consulta órfã", "Há sobreposições", "s.duracao_min + s.buffer_min"]) assert.match(backfill, new RegExp(trecho.replace(/[+]/g,"\\+")));
  assert.doesNotMatch(backfill, /00000000-0000-0000-0000-000000000000|REVISAR NOME/);
  for (const trecho of ["status set not null", "status_check", "buffer_snapshot_min", "status is distinct from 'cancelada'", "criar_paciente", "reservar_consulta", "atualizar_consulta", "exclusion_violation", "grant select", "revoke execute on function public.clinicnow_snapshot_consulta"] ) assert.match(finalize, new RegExp(trecho));
  assert.match(finalize, /from public,anon,authenticated/);
  assert.doesNotMatch(finalize, /grant\s+(insert|update|all)\s+on\s+public\.clinicnow_/i);
});

test("servidor default, inclusive owner, não autentica nem implementa integração", async () => {
  let autenticacoes = 0;
  const handler = criarHandler({ autenticar: async () => { autenticacoes++; return true; } });
  for (const [method, url] of [["GET", "/signed-url"], ["GET", "/gcal-status"], ["POST", "/gcal-event"]]) {
    let status; let payload;
    await handler({ method, url }, { writeHead(code) { status = code; }, end(body) { payload = body; } });
    assert.equal(status, 403); assert.match(payload, /external_integration_disabled/);
  }
  assert.equal(autenticacoes, 0);
  let status; const futuro = criarHandler({ integracoesHabilitadas:true, autenticar:async()=>true });
  await futuro({method:"GET",url:"/signed-url"},{writeHead(c){status=c;},end(){}}); assert.equal(status,501);
  const fonte = await readFile(new URL("../server.mjs", import.meta.url),"utf8");
  assert.doesNotMatch(fonte,/\bfetch\s*\(|execFile|readFileSync|ELEVENLABS_API_KEY|emily-agent-id/);
});

test("localStorage v3 remove legado e quarentena estado com PII sem preservá-lo", () => {
  class Storage { constructor(entries={}){this.m=new Map(Object.entries(entries));} getItem(k){return this.m.has(k)?this.m.get(k):null;} setItem(k,v){this.m.set(k,String(v));} removeItem(k){this.m.delete(k);} }
  const invalido = structuredClone(SEED_SYNTHETIC);
  invalido.clinicnow_pacientes.push({id:"paciente-1",clinic_id:"demo",nome:"Paciente Demo 01",telefone:"617",drive_url:null,criado_em:"2026-08-11T00:00:00.000Z"});
  assert.equal(validarEstadoSintetico(invalido),false);
  const storage = new Storage({ [CHAVE_SYNTHETIC]:JSON.stringify(invalido), "clinicnow.synthetic.v2":JSON.stringify({segredo:"não preservar"}) });
  const limpo = inicializarEstadoSintetico(storage);
  assert.equal(limpo.clinicnow_pacientes.length,0); assert.equal(storage.getItem(CHAVE_SYNTHETIC),null); assert.equal(storage.getItem("clinicnow.synthetic.v2"),null);
  const q=storage.getItem(CHAVE_QUARENTENA); assert.match(q,/conteudo_preservado/); assert.doesNotMatch(q,/617|segredo/);
});

test("comando padrão não sobe servidor externo e UI usa RPCs", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts.dev, "npm run dev:synthetic");
  assert.doesNotMatch(pkg.scripts["dev:synthetic"], /server\.mjs|concurrently/);
  assert.doesNotMatch(pkg.scripts["dev:owner"], /server\.mjs|concurrently|env-file/);
  const [pacientes, agenda, auth] = await Promise.all([
    readFile(new URL("../src/tabs/Pacientes.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/tabs/Agenda.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/auth.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(pacientes, /criarPaciente/); assert.doesNotMatch(pacientes, /\.insert\(/);
  assert.match(agenda, /reservarConsulta/); assert.match(agenda, /atualizarConsulta/); assert.doesNotMatch(agenda, /Agendar mesmo assim|Confirmar mesmo assim/);
  assert.match(auth, /Modo owner indisponível/); assert.match(auth, /nenhum dado sintético/);
});
