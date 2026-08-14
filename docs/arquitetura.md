# Arquitetura atual — fundação E2 local

## Modo sintético (padrão comprovado)

```text
React/Vite
  -> adapter localStorage
  -> aliases Paciente Demo NN
  -> RPCs locais com bloqueio de conflito
  -> nenhum servidor de integração
```

`npm run dev:synthetic` sobe somente o Vite. Agenda e Pacientes rejeitam nomes, telefone e Drive reais. Emily/Google não são acionados; `server.mjs` retorna 403 por padrão nos três endpoints externos em qualquer modo e não contém fetch/Composio/leitura de segredos.

## Modo owner (contrato preparado, não verificado remotamente)

```text
Supabase Auth -> OwnerGate -> RLS por clinic_id
                            -> criar_paciente RPC
                            -> reservar_consulta RPC
                            -> atualizar_consulta RPC
                            -> constraint GiST anti-overbooking
```

Os artefatos manuais são faseados em containment, bootstrap/backfill e finalize. O navegador recebe apenas SELECT; clínica, preço, duração, buffer e término são derivados no banco. Consulte `docs/e2-owner-mode-runbook.md`.

Não há evidência neste repositório de aplicação SQL, isolamento remoto ou integração externa ativa. Integrações ficam desligadas também em owner nesta E2. Os documentos em `docs/decisoes/2026-08-08*` e `2026-08-09*` são históricos.
