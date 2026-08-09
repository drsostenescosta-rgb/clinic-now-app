# CLAUDE.md — clinic-now-app

App único do ClinicNow (React+Vite PWA, pt-BR). **v1**: sidebar esquerda com todos os módulos; funcionam Agenda (semanal estilo Google Calendar) · Emily · Pacientes · Serviços · Financeiro · Configurações; Crescimento/Lia/Vitrine são "em breve". Agenda é a tela principal. **Todos os valores em DÓLAR (US$).**

## Stack e comandos

- React 18 + Vite (porta **5190**), sem TypeScript por ora. `npm run dev` sobe **dois** processos via concurrently: `server.mjs` (porta **4790**: signed URL ElevenLabs + `/gcal-status` + `/gcal-event` via Composio CLI) e o Vite.
- Supabase projeto **sosmed** (`yaqphldowpshhrtvvfaq`, sa-east-1). Tabelas deste app: `clinicnow_pacientes` (com `drive_url`), `clinicnow_consultas` (com `servico_id` FK, `preco_usd`, `tip_usd`, `google_event_id`, `status`), `clinicnow_servicos` (catálogo em USD — fonte de verdade de preços). RLS ligada; anon: select/insert/update nessas três (sem delete). Chave publishable no `.env` (`VITE_SUPABASE_*`).
- Emily: agente ElevenLabs "Emily — ClinicNow Recepção" (`emily-agent-id.txt`), chat de TEXTO via `@elevenlabs/client` (`textOnly: true`). Propostas: linha `[PROPOSTA] paciente=…; servico=…; inicio=…` → botão confirmar → insert em `clinicnow_consultas` com preço do catálogo → tentativa best-effort de evento no Google Agenda (fallback .ics).
- **Mudou preço na aba Serviços? Rode `npm run emily:update`** — reescreve o prompt do agente lendo `clinicnow_servicos`.
- Google Agenda: precisa de `composio link googlecalendar` ativo (ver Configurações no app e `docs/decisoes/2026-08-08-v1-google-agenda-fallback-ics.md`).

## O que NÃO fazer

- Não colocar `ELEVENLABS_API_KEY` em código de navegador — só `server.mjs` lê o `.env`.
- Não usar dados reais de pacientes: v1 é 100% sintético (LGPD; E2 Auth+RLS é bloqueante antes de qualquer dado real).
- Não construir os módulos "em breve" sem decisão de fase (roteiro em `docs/arquitetura.md` §8).
- Preços: fonte única é a tabela `clinicnow_servicos`; nunca hardcodar catálogo no app, e sincronizar a Emily via `npm run emily:update` após mudanças.
