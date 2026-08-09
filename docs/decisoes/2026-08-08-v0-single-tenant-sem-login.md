# Decisão — v0 single-tenant, sem login, políticas anon abertas nas duas tabelas do app

**Data:** 2026-08-08 · **Autor:** Sheldon/executor · **Status:** aceita para o v0, com data de morte marcada

## Contexto

Sostenes pediu o sistema REAL navegável (não demo roteirizada) no menor caminho ponta a ponta. Autenticação e multi-tenancy adiariam a fatia em dias sem mudar o que ele precisa ver: Emily conversando, agendamento caindo no banco, dados persistindo.

## Escolha

- Sem login no v0. A chave publishable (anon) tem políticas RLS de **select/insert apenas** em `clinicnow_pacientes` e `clinicnow_consultas` (sem update/delete; nenhuma outra tabela do `sosmed` é alcançável pela anon).
- Single-tenant: uma clínica fictícia ("Clínica Demonstração"), dados 100% sintéticos.

## Consequências e limites (por que isso NÃO pode receber dado real)

- Qualquer pessoa com a URL + chave publishable lê e insere nessas duas tabelas. Aceitável só porque: roda local, dados sintéticos, tabelas isoladas.
- **Bloqueante antes de qualquer dado real ou deploy:** Supabase Auth + RLS por dono (E2 do backlog) + checklist de segurança da skill cofundador-tecnico. Item de segurança entra em "Agora", não em "Depois".

## O que nos faria voltar atrás

Se o v0 for exposto publicamente ou receber qualquer dado não sintético antes do E2 — nesse caso, derrubar as políticas anon imediatamente.
