# Backlog — clinic-now-app

## Agora (esta semana)

- [ ] E2. Login (Supabase Auth) + RLS por dono — valor: dado da clínica protegido de verdade, pré-requisito para qualquer dado real — esforço: M (v1.1 já removeu os UPDATEs anônimos de servicos/pacientes e restringiu consultas por coluna; E2 continua obrigatório antes de dado real)
- [ ] Reativar edição de preços na aba Serviços quando o E2 (login do dono) existir — a v1.1 tornou o catálogo somente leitura no app (ver docs/decisoes/2026-08-09-v1.1-rls-anon-minimo.md)
- [ ] E3. Emily consulta a agenda real antes de propor horário (tool/webhook de disponibilidade) — valor: Emily para de propor horário ocupado — esforço: M
- [ ] E4. Vincular consulta a paciente cadastrado (FK pacientes) + tela de detalhe do paciente com histórico — valor: prontuário começa a existir — esforço: P
- [ ] Sostenes: rodar `composio link googlecalendar` para ativar o Google Agenda real (o código já está pronto; ver docs/decisoes/2026-08-08-v1-google-agenda-fallback-ics.md)

## Próximo

- [ ] E5. Drive profundo por paciente (criar pasta automática via Composio googledrive, listar arquivos) — v1 tem só drive_url + botão
- [ ] Sincronizar prompt da Emily automaticamente quando um preço mudar na aba Serviços (hoje: rodar `npm run emily:update` manualmente)
- [ ] Aba Lia (Fase 3 da arquitetura)
- [ ] Voz da Emily (mesmo agente, `textOnly` off) com gates

## Depois (não refinado)

- WhatsApp Cloud API como canal da Emily (Fase 1 do PRD)
- Multi-tenant `clinica` (exige design doc próprio — porta de mão única)
- Editar/cancelar evento no Google quando a consulta muda (v1 só cria)

## Feito

- [x] V1.1 (2026-08-09, resposta à devolução do Sheldon Pai, nota 75): (1) anti-overbooking — checagem de conflito no banco ao criar/editar na Agenda E ao confirmar pela Emily, com aviso claro + "Escolher outro horário" / "Agendar mesmo assim", e eventos simultâneos lado a lado na grade (estilo Google Calendar); (2) drawer mobile consertado em 375px (fechado = display:none — nunca fica preso no meio da transição; largura legível min(80vw,300px); fecha ao navegar); (3) RLS mínimo: sem UPDATE anônimo em servicos/pacientes, UPDATE de consultas restrito por coluna (migration clinicnow_v1_1_rls_anon_minimo; aba Serviços virou somente leitura até o E2); (4) 2 consultas legadas v0 saneadas para serviços do catálogo; (5) aria-labels na sidebar + aria-current/aria-expanded — aprendizado: transition de transform em drawer pode congelar no meio quando o navegador pausa render; estado binário (display) é à prova disso

- [x] V1 completa (2026-08-08): sidebar esquerda com 9 módulos (3 "em breve"), agenda SEMANAL estilo Google Calendar (clique em slot cria, clique em bloco edita/cancela, cores por categoria), catálogo real em DÓLAR na tabela `clinicnow_servicos` (8 serviços, aba Serviços edita), gorjetas + status na consulta, aba Financeiro (dia/semana, serviços × gorjetas), Drive por paciente (drive_url + botão), prompt da Emily atualizado com o catálogo USD (`npm run emily:update` lê o Supabase), Google Agenda best-effort via Composio com fallback .ics honesto — aprendizado: conexão Composio expirada NÃO pode travar o fluxo; o app avisa e segue
- [x] E1. v0 real ponta a ponta: Emily (agente ElevenLabs, chat texto) + Agenda + Pacientes persistidos no Supabase, confirmação de agendamento via Emily caindo na Agenda (2026-08-08) — aprendizado: marcar a proposta com linha estruturada `[PROPOSTA]` no prompt torna o handoff IA→banco confiável sem parser de linguagem natural
