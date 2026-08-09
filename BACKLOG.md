# Backlog — clinic-now-app

## Agora (esta semana)

- [ ] E2. Login (Supabase Auth) + RLS por dono — valor: dado da clínica protegido de verdade, pré-requisito para qualquer dado real — esforço: M
- [ ] E3. Emily consulta a agenda real antes de propor horário (tool/webhook de disponibilidade) — valor: Emily para de propor horário ocupado — esforço: M
- [ ] E4. Vincular consulta a paciente cadastrado (FK) + tela de detalhe — valor: histórico por paciente começa a existir — esforço: P

## Próximo

- [ ] Catálogo `produtos` no banco (fonte de verdade única da Emily — hoje duplicado prompt/app)
- [ ] Aba Lia (Fase 3 da arquitetura)
- [ ] Voz da Emily (mesmo agente, `textOnly` off) com gates

## Depois (não refinado)

- WhatsApp Cloud API como canal da Emily (Fase 1 do PRD)
- Multi-tenant `clinica` (exige design doc próprio — porta de mão única)

## Feito

- [x] E1. v0 real ponta a ponta: Emily (agente ElevenLabs, chat texto) + Agenda + Pacientes persistidos no Supabase, confirmação de agendamento via Emily caindo na Agenda (2026-08-08) — aprendizado: marcar a proposta com linha estruturada `[PROPOSTA]` no prompt torna o handoff IA→banco confiável sem parser de linguagem natural
