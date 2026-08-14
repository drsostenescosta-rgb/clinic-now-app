-- E2.3 FINALIZE: execute só após o preflight da etapa 002 terminar sem erro.
begin;
create extension if not exists btree_gist;
do $$ begin
  if exists (select 1 from public.clinicnow_servicos where clinic_id is null)
    or exists (select 1 from public.clinicnow_pacientes where clinic_id is null)
    or exists (select 1 from public.clinicnow_servicos where buffer_min is null or buffer_min < 0)
    or exists (select 1 from public.clinicnow_consultas where clinic_id is null or duracao_snapshot_min is null or buffer_snapshot_min is null or termina_em is null or status is null) then
    raise exception 'Preflight E2 incompleto; não finalize.';
  end if;
end $$;
alter table public.clinicnow_servicos alter column clinic_id set not null;
alter table public.clinicnow_pacientes alter column clinic_id set not null;
alter table public.clinicnow_consultas alter column clinic_id set not null;
alter table public.clinicnow_consultas alter column duracao_snapshot_min set not null;
alter table public.clinicnow_servicos alter column buffer_min set not null;
alter table public.clinicnow_consultas alter column buffer_snapshot_min set not null;
alter table public.clinicnow_consultas alter column termina_em set not null;
alter table public.clinicnow_consultas alter column status set not null;
alter table public.clinicnow_consultas add constraint clinicnow_consultas_status_check check (status in ('agendada','concluida','cancelada'));
alter table public.clinicnow_consultas add constraint clinicnow_consultas_duracao_check check (duracao_snapshot_min > 0);
alter table public.clinicnow_servicos add constraint clinicnow_servicos_buffer_check check (buffer_min >= 0);
alter table public.clinicnow_consultas add constraint clinicnow_consultas_buffer_check check (buffer_snapshot_min >= 0);
alter table public.clinicnow_consultas add constraint clinicnow_consultas_termina_em_check check (termina_em > inicio);

create or replace function public.clinicnow_snapshot_consulta() returns trigger language plpgsql security definer set search_path = public as $$
declare v_servico public.clinicnow_servicos%rowtype;
begin
  select * into v_servico from public.clinicnow_servicos where id = new.servico_id and clinic_id = new.clinic_id;
  if not found then raise exception 'serviço não pertence à clínica'; end if;
  new.servico := v_servico.nome; new.preco_usd := v_servico.preco_usd;
  new.duracao_snapshot_min := v_servico.duracao_min;
  new.buffer_snapshot_min := v_servico.buffer_min;
  new.termina_em := new.inicio + make_interval(mins => v_servico.duracao_min + v_servico.buffer_min);
  return new;
end $$;
create trigger clinicnow_consultas_snapshot_insert before insert on public.clinicnow_consultas
  for each row execute function public.clinicnow_snapshot_consulta();
create trigger clinicnow_consultas_snapshot_update before update of clinic_id, servico_id, inicio, duracao_snapshot_min, buffer_snapshot_min, termina_em on public.clinicnow_consultas
  for each row execute function public.clinicnow_snapshot_consulta();
alter table public.clinicnow_consultas add constraint clinicnow_consultas_sem_sobreposicao
  exclude using gist (clinic_id with =, tstzrange(inicio, termina_em, '[)') with &&)
  where (status is distinct from 'cancelada') deferrable initially immediate;

create or replace function public.clinicnow_e_dona(p_clinic_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clinicnow_clinicas where id = p_clinic_id and owner_id = auth.uid())
$$;
create policy "owner clinic select" on public.clinicnow_clinicas for select to authenticated using (owner_id = auth.uid());
create policy "owner servicos select" on public.clinicnow_servicos for select to authenticated using (public.clinicnow_e_dona(clinic_id));
create policy "owner pacientes select" on public.clinicnow_pacientes for select to authenticated using (public.clinicnow_e_dona(clinic_id));
create policy "owner consultas select" on public.clinicnow_consultas for select to authenticated using (public.clinicnow_e_dona(clinic_id));

create or replace function public.criar_paciente(p_nome text, p_telefone text default null, p_drive_url text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_clinic uuid; v_paciente public.clinicnow_pacientes%rowtype;
begin
  select id into v_clinic from public.clinicnow_clinicas where owner_id = auth.uid();
  if v_clinic is null then raise exception 'owner sem clínica'; end if;
  if nullif(trim(p_nome), '') is null then return jsonb_build_object('ok', false, 'code', 'nome_invalido'); end if;
  insert into public.clinicnow_pacientes(clinic_id,nome,telefone,drive_url)
  values(v_clinic,trim(p_nome),nullif(trim(p_telefone),''),nullif(trim(p_drive_url),'')) returning * into v_paciente;
  return jsonb_build_object('ok',true,'paciente',to_jsonb(v_paciente));
end $$;

create or replace function public.atualizar_consulta(p_consulta_id text, p_servico_id text, p_inicio timestamptz, p_tip_usd numeric, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_clinic uuid; v_servico public.clinicnow_servicos%rowtype; v_consulta public.clinicnow_consultas%rowtype;
begin
  select id into v_clinic from public.clinicnow_clinicas where owner_id=auth.uid();
  if v_clinic is null then raise exception 'owner sem clínica'; end if;
  if p_status not in ('agendada','concluida','cancelada') then return jsonb_build_object('ok',false,'code','status_invalido'); end if;
  select * into v_servico from public.clinicnow_servicos where id::text=p_servico_id and clinic_id=v_clinic;
  if not found then return jsonb_build_object('ok',false,'code','servico_invalido'); end if;
  begin
    update public.clinicnow_consultas set servico_id=v_servico.id,inicio=p_inicio,tip_usd=greatest(coalesce(p_tip_usd,0),0),status=p_status
    where id::text=p_consulta_id and clinic_id=v_clinic returning * into v_consulta;
  exception when exclusion_violation then return jsonb_build_object('ok',false,'code','conflito'); end;
  if v_consulta.id is null then return jsonb_build_object('ok',false,'code','consulta_invalida'); end if;
  return jsonb_build_object('ok',true,'consulta',to_jsonb(v_consulta));
end $$;

create or replace function public.reservar_consulta(p_paciente_nome text, p_servico_id text, p_inicio timestamptz, p_origem text default 'manual')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_clinic uuid; v_servico public.clinicnow_servicos%rowtype; v_consulta public.clinicnow_consultas%rowtype;
begin
  select id into v_clinic from public.clinicnow_clinicas where owner_id = auth.uid();
  if v_clinic is null then raise exception 'owner sem clínica'; end if;
  select * into v_servico from public.clinicnow_servicos where id::text=p_servico_id and clinic_id=v_clinic;
  if not found then return jsonb_build_object('ok',false,'code','servico_invalido'); end if;
  begin
    insert into public.clinicnow_consultas(clinic_id,paciente_nome,servico_id,servico,preco_usd,duracao_snapshot_min,buffer_snapshot_min,inicio,termina_em,origem,status)
    values(v_clinic,nullif(trim(p_paciente_nome),''),v_servico.id,v_servico.nome,v_servico.preco_usd,v_servico.duracao_min,v_servico.buffer_min,p_inicio,p_inicio+make_interval(mins=>v_servico.duracao_min+v_servico.buffer_min),coalesce(nullif(trim(p_origem),''),'manual'),'agendada') returning * into v_consulta;
  exception when exclusion_violation then return jsonb_build_object('ok',false,'code','conflito'); end;
  return jsonb_build_object('ok',true,'consulta',to_jsonb(v_consulta));
end $$;

revoke all on public.clinicnow_clinicas,public.clinicnow_servicos,public.clinicnow_pacientes,public.clinicnow_consultas from public,anon,authenticated;
grant select on public.clinicnow_clinicas,public.clinicnow_servicos,public.clinicnow_pacientes,public.clinicnow_consultas to authenticated;
revoke all on function public.clinicnow_e_dona(uuid) from public, anon, authenticated;
grant execute on function public.clinicnow_e_dona(uuid) to authenticated;
revoke execute on function public.clinicnow_snapshot_consulta() from public, anon, authenticated;
revoke all on function public.criar_paciente(text,text,text), public.reservar_consulta(text,text,timestamptz,text), public.atualizar_consulta(text,text,timestamptz,numeric,text) from public, anon, authenticated;
grant execute on function public.criar_paciente(text,text,text), public.reservar_consulta(text,text,timestamptz,text), public.atualizar_consulta(text,text,timestamptz,numeric,text) to authenticated;
commit;
