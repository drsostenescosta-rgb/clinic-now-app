-- E2.1 CONTAINMENT/SCHEMA. Não cria owner, não move dados e não habilita uso real.
begin;
create table if not exists public.clinicnow_clinicas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete restrict,
  nome text not null,
  criado_em timestamptz not null default now()
);
alter table public.clinicnow_servicos add column if not exists clinic_id uuid references public.clinicnow_clinicas(id);
alter table public.clinicnow_servicos add column if not exists buffer_min integer;
alter table public.clinicnow_pacientes add column if not exists clinic_id uuid references public.clinicnow_clinicas(id);
alter table public.clinicnow_consultas add column if not exists clinic_id uuid references public.clinicnow_clinicas(id);
alter table public.clinicnow_consultas add column if not exists duracao_snapshot_min integer;
alter table public.clinicnow_consultas add column if not exists buffer_snapshot_min integer;
alter table public.clinicnow_consultas add column if not exists termina_em timestamptz;

-- Contenção imediata: nenhum papel do navegador acessa legado entre as etapas.
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname='public' and tablename in ('clinicnow_clinicas','clinicnow_servicos','clinicnow_pacientes','clinicnow_consultas')
  loop execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;
revoke all on public.clinicnow_clinicas, public.clinicnow_servicos,
  public.clinicnow_pacientes, public.clinicnow_consultas from public, anon, authenticated;
alter table public.clinicnow_clinicas enable row level security;
alter table public.clinicnow_servicos enable row level security;
alter table public.clinicnow_pacientes enable row level security;
alter table public.clinicnow_consultas enable row level security;
commit;
