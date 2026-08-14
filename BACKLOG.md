# Backlog — clinic-now-app

## Agora (esta semana)

- [ ] Aplicar e verificar remotamente as três etapas E2 com backup, owner confirmado e duas contas sintéticas. O código local não prova RLS remoto.
- [ ] Projetar edição auditada de catálogo; permanecer somente leitura até então.
- [ ] E3. Emily consulta a agenda real antes de propor horário (tool/webhook de disponibilidade) — valor: Emily para de propor horário ocupado — esforço: M
- [ ] E4. Vincular consulta a paciente cadastrado (FK pacientes) + tela de detalhe do paciente com histórico — valor: prontuário começa a existir — esforço: P
- [ ] Decidir integração de calendário em fase própria, após E2 remota e autorização explícita.

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

- [x] Fundação E2 local (2026-08-11): modos synthetic/owner explícitos, login fail-closed, migrations faseadas, RPCs de paciente/reserva/atualização, alias sintético obrigatório e servidor synthetic sem chamadas externas. Testes locais não equivalem a aplicação Supabase.

- [x] V1.1 (2026-08-09, resposta à devolução do Sheldon Pai, nota 75): (1) anti-overbooking — checagem de conflito no banco ao criar/editar na Agenda E ao confirmar pela Emily, com aviso claro + "Escolher outro horário" / "Agendar mesmo assim", e eventos simultâneos lado a lado na grade (estilo Google Calendar); (2) drawer mobile consertado em 375px (fechado = display:none — nunca fica preso no meio da transição; largura legível min(80vw,300px); fecha ao navegar); (3) RLS mínimo: sem UPDATE anônimo em servicos/pacientes, UPDATE de consultas restrito por coluna (migration clinicnow_v1_1_rls_anon_minimo; aba Serviços virou somente leitura até o E2); (4) 2 consultas legadas v0 saneadas para serviços do catálogo; (5) aria-labels na sidebar + aria-current/aria-expanded — aprendizado: transition de transform em drawer pode congelar no meio quando o navegador pausa render; estado binário (display) é à prova disso

- [x] V1 completa (2026-08-08): sidebar esquerda com 9 módulos (3 "em breve"), agenda SEMANAL estilo Google Calendar (clique em slot cria, clique em bloco edita/cancela, cores por categoria), catálogo real em DÓLAR na tabela `clinicnow_servicos` (8 serviços, aba Serviços edita), gorjetas + status na consulta, aba Financeiro (dia/semana, serviços × gorjetas), Drive por paciente (drive_url + botão), prompt da Emily atualizado com o catálogo USD (`npm run emily:update` lê o Supabase), Google Agenda best-effort via Composio com fallback .ics honesto — aprendizado: conexão Composio expirada NÃO pode travar o fluxo; o app avisa e segue
- [x] E1. v0 real ponta a ponta: Emily (agente ElevenLabs, chat texto) + Agenda + Pacientes persistidos no Supabase, confirmação de agendamento via Emily caindo na Agenda (2026-08-08) — aprendizado: marcar a proposta com linha estruturada `[PROPOSTA]` no prompt torna o handoff IA→banco confiável sem parser de linguagem natural
