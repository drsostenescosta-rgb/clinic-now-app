# CLAUDE.md — clinic-now-app

Fundação local E2 do ClinicNow (React + Vite, pt-BR). O único estado comprovado é `synthetic`.

## Comandos e limites

- `npm run dev` e `npm run dev:synthetic`: somente Vite, dados em `localStorage`, aliases `Paciente Demo NN`.
- `npm test` e `npm run build`: validação local.
- `npm run dev:owner`: reservado para depois das três migrations E2 aplicadas e verificadas. Não há evidência disso hoje.
- `server.mjs` não implementa integrações e devolve 403 por padrão também em owner; `dev:owner` sobe só Vite.

## Segurança

- Não usar nomes, telefone, Drive, conversas, anamnese ou qualquer dado real no modo sintético.
- Não aplicar migrations, conectar Supabase, ElevenLabs, Composio, Google, WhatsApp ou Instagram sem autorização e postflight próprios.
- Não alegar RLS/live: os artefatos em `supabase/e2-staged/` e `supabase/admin/` não foram executados.
- Criação de paciente e criação/edição de consulta passam por RPCs; não reintroduzir grants diretos de INSERT/UPDATE ao navegador.
- Nunca permitir bypass de conflito. Snapshot de preço/duração/término deriva do serviço.

Leia `docs/e2-owner-mode-runbook.md` e `docs/arquitetura.md` antes de modificar o modo owner. Os documentos de decisão de 08–09/08 são históricos.
