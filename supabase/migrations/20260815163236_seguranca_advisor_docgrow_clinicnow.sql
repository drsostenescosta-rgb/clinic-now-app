-- Correção dos achados do Security Advisor (15/08/2026) — projeto sosmed.
-- Objetos de origem: DocGrow/MedGroth (28/07) e Farol/SosMed. Nada aqui veio do
-- piloto da Andreia. Consumidores verificados em clinicnow/painel.html,
-- clinicnow/aplicacao.html e medgrowth/emily-vendas/lib.mjs ANTES de qualquer mudança.
--
-- Estado verificado antes de aplicar (Postgres 17.6):
--   · docgrow_funil_resumo: dono postgres, sem reloptions (= definer), anon COM SELECT
--   · docgrow_pageviews: RLS ligada, policy "pageview leitura autenticada" (SELECT,
--     authenticated, using true) JÁ EXISTIA — por isso invoker não quebra o painel
--   · handle_new_user: gatilho on_auth_user_created em auth.users, ativo
--   · clinicnow_wa_*: 0 linhas, nenhuma policy, nenhuma coluna de dono/tenant

-- ── ERROR 0010: view SECURITY DEFINER ────────────────────────────────
-- docgrow_funil_resumo agrega docgrow_pageviews. Como definer, rodava com as
-- permissões do dono (postgres) e IGNORAVA a RLS da tabela-base — e o anon tinha
-- SELECT na view, ou seja, visitante anônimo lia o funil inteiro.
alter view public.docgrow_funil_resumo set (security_invoker = on);
revoke all on public.docgrow_funil_resumo from anon, authenticated;
grant select on public.docgrow_funil_resumo to authenticated;
comment on view public.docgrow_funil_resumo is
  'Funil de visitas por página (agrega docgrow_pageviews). security_invoker=on: respeita a RLS de quem consulta. Leitura só de authenticated (painel do fundador, clinicnow/painel.html). anon insere pageview, nunca lê.';

-- ── WARN 0028/0029: docgrow_vagas_restantes() ────────────────────────
-- SECURITY DEFINER aqui é INTENCIONAL e load-bearing: a landing pública
-- (clinicnow/aplicacao.html, anon key) precisa do contador das 20 vagas sem
-- nunca ler medgroth_leads. O definer devolve só um inteiro agregado.
-- Não remover — o WARN do advisor permanece de propósito (risco aceito e documentado).
alter function public.docgrow_vagas_restantes() set search_path = public, pg_temp;
comment on function public.docgrow_vagas_restantes() is
  'SECURITY DEFINER INTENCIONAL (não remover): expõe ao anon apenas o número de vagas restantes, sem dar acesso a medgroth_leads. Retorno é um inteiro agregado, sem dado pessoal. Consumida por clinicnow/aplicacao.html. search_path fixo com pg_temp ao final.';

-- ── WARN: handle_new_user() ──────────────────────────────────────────
-- Gatilho on_auth_user_created em auth.users (cria a linha em profissionais).
-- Estava com EXECUTE para PUBLIC/anon/authenticated sem necessidade: o Postgres
-- valida EXECUTE na criação do gatilho, não a cada disparo. Revogar não afeta o
-- signup e remove a superfície de chamada direta via RPC.
revoke all on function public.handle_new_user() from public, anon, authenticated;
alter function public.handle_new_user() set search_path = public, pg_temp;
comment on function public.handle_new_user() is
  'Gatilho on_auth_user_created (auth.users) — cria public.profissionais no signup. SECURITY DEFINER necessário para escrever em profissionais sob RLS. EXECUTE revogado de public/anon/authenticated em 15/08/2026: gatilho não exige EXECUTE do usuário.';

-- ── INFO 0008: tabelas de WhatsApp com RLS e zero policy ─────────────
-- Deny-all é INTENCIONAL e correto. Único consumidor: circuito Emily Vendas
-- (medgrowth/emily-vendas/lib.mjs) via SUPABASE_SERVICE_KEY — service_role ignora RLS.
-- NÃO foi criada policy de leitura para o painel: as tabelas não têm coluna de
-- dono/tenant, então qualquer policy hoje seria using(true) e exporia conversa de
-- paciente a qualquer pessoa que se cadastrasse (o signup do Farol é aberto).
-- Isso depende da modelagem de `clinica` como tenant — ver clinic-now-access/docs/
-- ARQUITETURA_UNIFICACAO.md, que já marca essa migração como "decisão devagar".
comment on table public.clinicnow_wa_conversas is
  'Conversas de WhatsApp (Emily). RLS ligada SEM policy DE PROPÓSITO: acesso exclusivo do service_role (medgrowth/emily-vendas). Deny-all para anon/authenticated é o comportamento desejado — dado de paciente, LGPD. Policy de leitura para painel depende de coluna de tenant, que ainda não existe.';
comment on table public.clinicnow_wa_mensagens is
  'Mensagens de WhatsApp (Emily). RLS ligada SEM policy DE PROPÓSITO: acesso exclusivo do service_role. Conteúdo de conversa de paciente — deny-all para anon/authenticated é intencional. Ver comentário de clinicnow_wa_conversas.';

-- ── ROLLBACK (se precisar reverter) ──────────────────────────────────
-- alter view public.docgrow_funil_resumo reset (security_invoker);
-- grant select on public.docgrow_funil_resumo to anon, authenticated;
-- grant execute on function public.handle_new_user() to public, anon, authenticated;
-- alter function public.docgrow_vagas_restantes() set search_path = public;
-- alter function public.handle_new_user() set search_path = public;
