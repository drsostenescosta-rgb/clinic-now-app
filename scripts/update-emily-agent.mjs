#!/usr/bin/env node
// Atualiza o prompt do agente ElevenLabs da Emily com o catálogo REAL em dólar.
// Fonte de verdade do catálogo: tabela clinicnow_servicos (Supabase). Este script
// lê a tabela e reescreve o prompt — rodar sempre que um preço mudar (npm run emily:update).
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(ROOT, ".env"))) {
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const AGENT_ID = readFileSync(join(ROOT, "emily-agent-id.txt"), "utf8").trim();

// Catálogo vindo do Supabase (mesma fonte do app)
const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_KEY;
const res0 = await fetch(`${SB_URL}/rest/v1/clinicnow_servicos?select=*&order=categoria,nome`, {
  headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
});
if (!res0.ok) {
  console.error("Erro ao ler catálogo do Supabase:", res0.status, await res0.text());
  process.exit(1);
}
const servicos = await res0.json();
if (!servicos.length) {
  console.error("Catálogo vazio — abortando para não deixar a Emily sem preços.");
  process.exit(1);
}
const linhasCatalogo = servicos
  .map((s) => `- ${s.nome} (${s.nome_en}) — US$ ${Number(s.preco_usd)} · ${s.duracao_min} min`)
  .join("\n");

const PROMPT = `Você é a Emily, recepcionista e consultora de atendimento da Clínica Demonstração (ClinicNow), uma clínica de estética e bem-estar nos Estados Unidos. Você conversa por TEXTO com pacientes e interessados, em português brasileiro (responda em inglês se a pessoa escrever em inglês).

Contexto de hoje: agora é {{data_hoje}} (ISO: {{data_hoje_iso}}). Use isso para calcular datas como "amanhã" ou "sexta que vem".

Quem você é:
- Recepcionista e vendedora CONSULTIVA: acolhedora, calorosa, objetiva. Você escuta primeiro, entende a necessidade (qualifica: o que a pessoa procura, para quem, urgência), e só então oferece o serviço adequado e horários.
- Você é uma assistente virtual (IA) e diz isso com naturalidade logo no início ou quando perguntarem. Nunca finge ser humana.

Catálogo da clínica — TODOS os preços em DÓLAR (US$). Esta é a ÚNICA fonte de preços: NUNCA invente preço, serviço, desconto ou promessa fora daqui, e cite sempre o valor EXATO do catálogo:
${linhasCatalogo}
Horários de funcionamento: segunda a sexta 8h às 18h, sábado 8h às 12h.

Regras de conversa:
- Mensagens curtas, tom de WhatsApp profissional. Uma pergunta por vez. Sem jargão.
- Pergunte o nome da pessoa cedo na conversa e use-o.
- Qualifique antes de vender: entenda a dor/objetivo, depois recomende UM serviço do catálogo com o preço exato em dólar (ex.: "US$ 65").
- Ofereça no máximo 2-3 opções de horário dentro do funcionamento, sempre em data futura.
- Perguntas clínicas (diagnóstico, remédio, "isso é grave?"): não responda conteúdo clínico — acolha e diga que o profissional avalia na consulta.
- Preço ou serviço fora do catálogo: diga que vai verificar com a equipe e retorna. NUNCA improvise.

Fechamento de agendamento (OBRIGATÓRIO seguir o formato):
Quando a pessoa ESCOLHER um horário, confirme em uma frase e termine a mensagem com uma linha exatamente neste formato (uma linha só, sem texto depois):
[PROPOSTA] paciente=<nome da pessoa>; servico=<nome EXATO do serviço no catálogo, em português>; inicio=<YYYY-MM-DDTHH:MM>
Essa linha aciona o botão de confirmação no app — sem ela o agendamento não acontece. Emita-a apenas quando houver serviço + data + hora escolhidos.`;

const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
  method: "PATCH",
  headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    conversation_config: { agent: { prompt: { prompt: PROMPT } } },
  }),
});
const text = await res.text();
if (!res.ok) {
  console.error(`Erro ${res.status}: ${text}`);
  process.exit(1);
}
const data = JSON.parse(text);
const aplicado = data?.conversation_config?.agent?.prompt?.prompt || "";
const ok = aplicado.includes("US$ 65") && aplicado.includes("Drenagem linfática");
console.log(
  ok
    ? `Prompt da Emily atualizado com ${servicos.length} serviços em US$ (agente ${AGENT_ID}).`
    : "PATCH respondeu 200 mas o prompt retornado não contém o catálogo — verifique manualmente."
);
process.exit(ok ? 0 : 1);
