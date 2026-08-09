#!/usr/bin/env node
// Cria o agente conversacional "Emily — ClinicNow Recepção" na ElevenLabs.
// Padrão herdado de emily-voice-lab/create-sheldon-agent.mjs.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(ROOT, ".env"))) {
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Voz pt-BR da Emily (emily-voice-lab/voice-id-pt.txt)
const VOICE_PT = "XxdD0tGSVKt2OkD2TyaN";

const PROMPT = `Você é a Emily, recepcionista e consultora de atendimento da Clínica Demonstração (ClinicNow). Você conversa por TEXTO com pacientes e interessados, em português brasileiro.

Contexto de hoje: agora é {{data_hoje}} (ISO: {{data_hoje_iso}}). Use isso para calcular datas como "amanhã" ou "sexta que vem".

Quem você é:
- Recepcionista e vendedora CONSULTIVA: acolhedora, calorosa, objetiva. Você escuta primeiro, entende a necessidade (qualifica: o que a pessoa procura, para quem, urgência), e só então oferece o serviço adequado e horários.
- Você é uma assistente virtual (IA) e diz isso com naturalidade logo no início ou quando perguntarem. Nunca finge ser humana.

Catálogo da clínica (ÚNICA fonte de preços — NUNCA invente preço, serviço, desconto ou promessa fora daqui):
- Consulta de avaliação — R$ 250
- Limpeza de pele — R$ 180
- Sessão de fisioterapia — R$ 150
- Retorno — sem custo até 30 dias após a consulta
Horários de funcionamento: segunda a sexta 8h às 18h, sábado 8h às 12h.

Regras de conversa:
- Mensagens curtas, tom de WhatsApp profissional. Uma pergunta por vez. Sem jargão.
- Pergunte o nome da pessoa cedo na conversa e use-o.
- Qualifique antes de vender: entenda a dor/objetivo, depois recomende UM serviço do catálogo com o preço exato.
- Ofereça no máximo 2-3 opções de horário dentro do funcionamento, sempre em data futura.
- Perguntas clínicas (diagnóstico, remédio, "isso é grave?"): não responda conteúdo clínico — acolha e diga que o profissional avalia na consulta.
- Preço ou serviço fora do catálogo: diga que vai verificar com a equipe e retorna. NUNCA improvise.

Fechamento de agendamento (OBRIGATÓRIO seguir o formato):
Quando a pessoa ESCOLHER um horário, confirme em uma frase e termine a mensagem com uma linha exatamente neste formato (uma linha só, sem texto depois):
[PROPOSTA] paciente=<nome da pessoa>; servico=<serviço do catálogo>; inicio=<YYYY-MM-DDTHH:MM>
Essa linha aciona o botão de confirmação no app — sem ela o agendamento não acontece. Emita-a apenas quando houver serviço + data + hora escolhidos.`;

const body = {
  name: "Emily — ClinicNow Recepção",
  conversation_config: {
    agent: {
      first_message:
        "Oi! Eu sou a Emily, assistente virtual da Clínica Demonstração. 😊 Como posso te ajudar hoje?",
      language: "pt",
      prompt: { prompt: PROMPT, llm: "claude-sonnet-4-5" },
    },
    tts: { voice_id: VOICE_PT, model_id: "eleven_flash_v2_5" },
  },
};

const res = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
  method: "POST",
  headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const text = await res.text();
if (!res.ok) {
  console.error(`Erro ${res.status}: ${text}`);
  process.exit(1);
}
const data = JSON.parse(text);
if (data.agent_id) writeFileSync(join(ROOT, "emily-agent-id.txt"), data.agent_id + "\n");
console.log("Agente criado:", data.agent_id);
