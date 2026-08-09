# CLAUDE.md — clinic-now-app

App único do ClinicNow (React+Vite PWA, pt-BR, mobile-first). v0: abas Emily · Agenda · Pacientes reais; resto "em breve".

## Stack e comandos

- React 18 + Vite (porta **5190**), sem TypeScript por ora. `npm run dev` sobe **dois** processos via concurrently: `server.mjs` (porta **4790**, signed URL da ElevenLabs — chave só no servidor) e o Vite.
- Supabase projeto **sosmed** (`yaqphldowpshhrtvvfaq`, sa-east-1). Tabelas deste app: `clinicnow_pacientes`, `clinicnow_consultas` (RLS ligada; anon só select/insert nessas duas). Chave publishable no `.env` (`VITE_SUPABASE_*`).
- Emily: agente ElevenLabs "Emily — ClinicNow Recepção" (`emily-agent-id.txt`), chat de TEXTO via `@elevenlabs/client` (`textOnly: true`). Propostas de horário vêm marcadas com `[PROPOSTA] paciente=…; servico=…; inicio=…` na mensagem — o app parseia e mostra o botão de confirmar, que insere em `clinicnow_consultas` com `origem='emily'`.

## O que NÃO fazer

- Não colocar `ELEVENLABS_API_KEY` em código de navegador — só `server.mjs` lê o `.env`.
- Não usar dados reais de pacientes: v0 é 100% sintético (LGPD; ver `docs/decisoes/`).
- Não construir os módulos "em breve" sem decisão de fase (roteiro em `docs/arquitetura.md` §8).
- Catálogo/preços: a Emily só fala o que está no prompt dela (e no `CATALOGO` de `src/supabase.js`) — mudanças nos dois lugares juntos.
