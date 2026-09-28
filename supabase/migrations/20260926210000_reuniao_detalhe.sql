-- Detalhe da reunião: status, súmula, presença, vínculo com ações e log anti-fraude.

alter table public.cipa_reunioes
  add column if not exists status text not null default 'agendada',
  add column if not exists sumula text,
  add column if not exists concluida_em timestamptz;

alter table public.cipa_reunioes
  drop constraint if exists cipa_reunioes_status_check;

alter table public.cipa_reunioes
  add constraint cipa_reunioes_status_check
  check (status in ('agendada', 'concluida', 'cancelada'));

alter table public.cipa_membros
  add column if not exists email text;

alter table public.acoes
  add column if not exists reuniao_id uuid references public.cipa_reunioes (id) on delete set null;

create index if not exists acoes_reuniao_idx on public.acoes (reuniao_id);

create table if not exists public.cipa_reuniao_presenca (
  id uuid primary key default gen_random_uuid(),
  reuniao_id uuid not null references public.cipa_reunioes (id) on delete cascade,
  membro_id uuid not null references public.cipa_membros (id) on delete cascade,
  situacao text not null check (situacao in ('presente', 'faltante', 'justificado')),
  justificativa text,
  atualizado_em timestamptz not null default now(),
  unique (reuniao_id, membro_id)
);

create table if not exists public.cipa_reuniao_log (
  id uuid primary key default gen_random_uuid(),
  reuniao_id uuid not null references public.cipa_reunioes (id) on delete cascade,
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  usuario_id uuid,
  quando timestamptz not null default now(),
  evento text not null,
  detalhe text,
  apos_conclusao boolean not null default false
);

create index if not exists cipa_reuniao_log_idx
  on public.cipa_reuniao_log (reuniao_id, quando desc);

grant select, insert, update, delete on public.cipa_reuniao_presenca to authenticated;
grant select on public.cipa_reuniao_log to authenticated;
grant all on public.cipa_reuniao_presenca to service_role;
grant all on public.cipa_reuniao_log to service_role;

alter table public.cipa_reuniao_presenca enable row level security;
alter table public.cipa_reuniao_log enable row level security;

drop policy if exists "membro lê presença da reunião" on public.cipa_reuniao_presenca;
create policy "membro lê presença da reunião"
  on public.cipa_reuniao_presenca for select to authenticated
  using (
    exists (
      select 1 from public.cipa_reunioes r
      where r.id = reuniao_id and public.usuario_acessa_projeto(r.projeto_id)
    )
  );

drop policy if exists "membro grava presença da reunião" on public.cipa_reuniao_presenca;
create policy "membro grava presença da reunião"
  on public.cipa_reuniao_presenca for insert to authenticated
  with check (
    exists (
      select 1 from public.cipa_reunioes r
      where r.id = reuniao_id and public.usuario_acessa_projeto(r.projeto_id)
    )
  );

drop policy if exists "membro atualiza presença da reunião" on public.cipa_reuniao_presenca;
create policy "membro atualiza presença da reunião"
  on public.cipa_reuniao_presenca for update to authenticated
  using (
    exists (
      select 1 from public.cipa_reunioes r
      where r.id = reuniao_id and public.usuario_acessa_projeto(r.projeto_id)
    )
  )
  with check (
    exists (
      select 1 from public.cipa_reunioes r
      where r.id = reuniao_id and public.usuario_acessa_projeto(r.projeto_id)
    )
  );

drop policy if exists "membro remove presença da reunião" on public.cipa_reuniao_presenca;
create policy "membro remove presença da reunião"
  on public.cipa_reuniao_presenca for delete to authenticated
  using (
    exists (
      select 1 from public.cipa_reunioes r
      where r.id = reuniao_id and public.usuario_acessa_projeto(r.projeto_id)
    )
  );

drop policy if exists "membro lê o log da reunião" on public.cipa_reuniao_log;
create policy "membro lê o log da reunião"
  on public.cipa_reuniao_log for select to authenticated
  using (public.usuario_acessa_projeto(projeto_id));

create or replace function public.registrar_log_reuniao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  partes text[] := '{}';
  apos boolean := false;
begin
  if tg_op = 'INSERT' then
    insert into public.cipa_reuniao_log (reuniao_id, projeto_id, usuario_id, evento, apos_conclusao)
    values (new.id, new.projeto_id, auth.uid(), 'Reunião criada', false);
    return new;
  end if;

  apos := old.status = 'concluida';

  if new.data_reuniao is distinct from old.data_reuniao then
    partes := partes || 'Data alterada';
  end if;
  if new.tipo is distinct from old.tipo then
    partes := partes || 'Tipo alterado';
  end if;
  if new.pauta is distinct from old.pauta then
    partes := partes || 'Pauta alterada';
  end if;
  if new.sumula is distinct from old.sumula then
    partes := partes || 'Súmula alterada';
  end if;
  if new.ata is distinct from old.ata then
    partes := partes || 'Ata alterada';
  end if;
  if new.status is distinct from old.status then
    partes := partes || ('Situação: ' || coalesce(old.status, '—') || ' → ' || coalesce(new.status, '—'));
  end if;

  if coalesce(array_length(partes, 1), 0) = 0 then
    return new;
  end if;

  insert into public.cipa_reuniao_log (reuniao_id, projeto_id, usuario_id, evento, apos_conclusao)
  values (new.id, new.projeto_id, auth.uid(), array_to_string(partes, ' · '), apos);

  return new;
end;
$$;

drop trigger if exists trg_log_reuniao on public.cipa_reunioes;
create trigger trg_log_reuniao
  after insert or update on public.cipa_reunioes
  for each row
  execute function public.registrar_log_reuniao();

create or replace function public.registrar_log_presenca()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_projeto uuid;
  v_status text;
  v_nome text;
  v_evento text;
begin
  select r.projeto_id, r.status into v_projeto, v_status
  from public.cipa_reunioes r
  where r.id = coalesce(new.reuniao_id, old.reuniao_id);

  select m.nome into v_nome
  from public.cipa_membros m
  where m.id = coalesce(new.membro_id, old.membro_id);

  if tg_op = 'DELETE' then
    v_evento := 'Presença removida: ' || coalesce(v_nome, 'membro');
  elsif tg_op = 'INSERT' then
    v_evento := 'Presença de ' || coalesce(v_nome, 'membro') || ': ' || new.situacao;
  else
    if new.situacao is not distinct from old.situacao
       and new.justificativa is not distinct from old.justificativa then
      return new;
    end if;
    v_evento := 'Presença de ' || coalesce(v_nome, 'membro') || ': ' || coalesce(old.situacao, '—') || ' → ' || new.situacao;
    if new.justificativa is distinct from old.justificativa then
      v_evento := v_evento || ' · justificativa alterada';
    end if;
  end if;

  insert into public.cipa_reuniao_log (reuniao_id, projeto_id, usuario_id, evento, detalhe, apos_conclusao)
  values (
    coalesce(new.reuniao_id, old.reuniao_id),
    v_projeto,
    auth.uid(),
    v_evento,
    case when coalesce(new.situacao, '') = 'justificado' then new.justificativa else null end,
    v_status = 'concluida'
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_log_presenca on public.cipa_reuniao_presenca;
create trigger trg_log_presenca
  after insert or update or delete on public.cipa_reuniao_presenca
  for each row
  execute function public.registrar_log_presenca();

create or replace function public.registrar_log_acao_reuniao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reuniao uuid;
  v_projeto uuid;
  v_status text;
  v_evento text;
begin
  v_reuniao := coalesce(new.reuniao_id, old.reuniao_id);
  if v_reuniao is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE'
     and new.reuniao_id is not distinct from old.reuniao_id
     and new.status is not distinct from old.status then
    return new;
  end if;

  select r.projeto_id, r.status into v_projeto, v_status
  from public.cipa_reunioes r
  where r.id = v_reuniao;

  v_evento := 'Ação «' || coalesce(new.titulo, old.titulo) || '»';
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    v_evento := v_evento || ': ' || coalesce(old.status, '—') || ' → ' || coalesce(new.status, '—');
  elsif new.reuniao_id is distinct from old.reuniao_id then
    v_evento := v_evento || ' vinculada à reunião';
  end if;

  insert into public.cipa_reuniao_log (reuniao_id, projeto_id, usuario_id, evento, apos_conclusao)
  values (v_reuniao, v_projeto, auth.uid(), v_evento, v_status = 'concluida');

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_log_acao_reuniao on public.acoes;
create trigger trg_log_acao_reuniao
  after update on public.acoes
  for each row
  execute function public.registrar_log_acao_reuniao();
