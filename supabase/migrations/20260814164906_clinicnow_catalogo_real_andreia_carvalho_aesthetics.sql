-- APLICADA no projeto sosmed (yaqphldowpshhrtvvfaq) em 2026-08-14 como
-- 20260814164906_clinicnow_catalogo_real_andreia_carvalho_aesthetics.
-- Copia local para rastreabilidade. Idempotente.
--
-- Catalogo REAL da Andréia Carvalho Aesthetics (piloto familia ClinicNow).
-- Fonte: questionario de lacunas respondido por Andreia em 11/08/2026, item 3.2.
-- Substitui os servicos ficticios semeados na fase de demonstracao.
-- Nenhum dado de paciente envolvido.

alter table public.clinicnow_servicos
  add column if not exists buffer_min integer not null default 10,
  add column if not exists exige_avaliacao_previa boolean not null default false,
  add column if not exists ativo boolean not null default true;

comment on column public.clinicnow_servicos.buffer_min is
  'Intervalo de seguranca em minutos apos o atendimento (higienizacao/preparo). Andreia: 10 min para todos.';
comment on column public.clinicnow_servicos.exige_avaliacao_previa is
  'Quando true, a Emily agenda a AVALIACAO e nunca promete o procedimento.';
comment on column public.clinicnow_servicos.ativo is
  'Somente servicos ativos podem ser oferecidos. Desativar em vez de apagar preserva o FK de clinicnow_consultas.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clinicnow_servicos_buffer_min_nao_negativo') then
    alter table public.clinicnow_servicos
      add constraint clinicnow_servicos_buffer_min_nao_negativo check (buffer_min >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clinicnow_servicos_duracao_valida') then
    alter table public.clinicnow_servicos
      add constraint clinicnow_servicos_duracao_valida check (duracao_min between 15 and 240);
  end if;
end $$;

create unique index if not exists clinicnow_servicos_nome_unico on public.clinicnow_servicos (nome);

-- Desativa TODO o catalogo ficticio. Nao apaga: clinicnow_consultas.servico_id referencia estas linhas.
update public.clinicnow_servicos set ativo = false;

insert into public.clinicnow_servicos
  (nome, nome_en, duracao_min, buffer_min, preco_usd, categoria, exige_avaliacao_previa, ativo)
values
  ('Drenagem linfática',     'Lymphatic drainage',    50, 10,  60.00, 'massagem',       true, true),
  ('Pós-operatório',         'Post-operative care',   80, 10, 100.00, 'pos-operatorio', true, true),
  ('Massoterapia masculina', 'Men''s massage therapy', 50, 10,  70.00, 'massagem',      true, true)
on conflict (nome) do update set
  nome_en                = excluded.nome_en,
  duracao_min            = excluded.duracao_min,
  buffer_min             = excluded.buffer_min,
  preco_usd              = excluded.preco_usd,
  categoria              = excluded.categoria,
  exige_avaliacao_previa = excluded.exige_avaliacao_previa,
  ativo                  = true;
