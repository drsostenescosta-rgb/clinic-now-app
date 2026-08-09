# Decisão — v1: Google Agenda best-effort via Composio, com fallback .ics

**Data:** 2026-08-08 · **Autor:** Sheldon/executor · **Status:** aceita

## Contexto

A v1 deveria criar o evento no Google Agenda real ao confirmar uma consulta, usando o Composio
(logado como drsostenescosta@gmail.com). **Estado real verificado em 2026-08-08:** a conexão
`googlecalendar` do Composio está **EXPIRED** — `composio execute GOOGLECALENDAR_EVENTS_LIST`
retorna `ToolRouterV2_NoActiveConnection`. Reativar exige OAuth interativo do próprio Sostenes
(`composio link googlecalendar`), que nenhum agente pode fazer por ele.

## Escolha

1. O token-server (4790) ganhou dois endpoints: `GET /gcal-status` (conexão ativa? — cache 60s)
   e `POST /gcal-event` (chama `composio execute GOOGLECALENDAR_CREATE_EVENT` via CLI).
2. Toda confirmação de consulta (Emily ou manual) TENTA o Google e **nunca trava**: se falhar,
   a consulta é salva normalmente e o app avisa com honestidade ("Google Agenda não conectado").
3. Fallback sempre disponível: botão **📆 .ics** no detalhe de cada consulta (arquivo de
   calendário padrão, importável em qualquer agenda).
4. Aba Configurações mostra o estado real da conexão + instrução exata para conectar.
5. Quando Sostenes rodar `composio link googlecalendar`, a integração passa a funcionar sem
   nenhuma mudança de código: o próximo confirmar cria o evento e grava `google_event_id`.

## Nota de segurança (herda a decisão v0)

As políticas anon ganharam **UPDATE** em `clinicnow_servicos`, `clinicnow_consultas` e
`clinicnow_pacientes` (editar preço, gorjeta/status, drive_url). Ainda sem DELETE. Continua
aceitável SOMENTE porque roda local com dados 100% sintéticos — o bloqueante E2 (Auth + RLS
por dono) segue valendo antes de qualquer dado real ou deploy.

## Pendência marcada

- E5: integração profunda do Drive por paciente (criar pasta automática, listar arquivos) —
  v1 tem só `drive_url` + botão "📁 Prontuário no Drive".
