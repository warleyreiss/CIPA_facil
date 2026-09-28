-- Cole tudo no SQL Editor do Supabase (projeto CIPA Facil, nxkrjgcieppggcoxyjbg) e clique em Run.
-- Pode rodar mais de uma vez sem problema.

-- ===== 20260927160000_reuniao_agenda_publica =====
-- Horário e local da reunião, e link público de agenda por código secreto.

alter table public.cipa_reunioes
  add column if not exists hora_inicio time,
  add column if not exists hora_fim time,
  add column if not exists local text,
  add column if not exists token_agenda uuid not null default gen_random_uuid();

create unique index if not exists cipa_reunioes_token_agenda_idx on public.cipa_reunioes (token_agenda);

alter table public.cipa_reunioes drop constraint if exists cipa_reunioes_horario_check;
alter table public.cipa_reunioes
  add constraint cipa_reunioes_horario_check
  check (hora_fim is null or (hora_inicio is not null and hora_fim > hora_inicio));

comment on column public.cipa_reunioes.hora_inicio is 'Horário de início informado pelo usuário.';
comment on column public.cipa_reunioes.hora_fim is 'Horário de término informado pelo usuário.';
comment on column public.cipa_reunioes.local is 'Local da reunião informado pelo usuário.';
comment on column public.cipa_reunioes.token_agenda is 'Código secreto do link público de agenda.';

-- Quem tem o código vê só os dados da agenda. Sem login.
create or replace function public.agenda_reuniao(p_token uuid)
returns table (
  data_reuniao date,
  tipo text,
  hora_inicio time,
  hora_fim time,
  local text,
  sumula text,
  status text,
  empresa text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.data_reuniao,
    r.tipo,
    r.hora_inicio,
    r.hora_fim,
    r.local,
    coalesce(r.sumula, r.pauta),
    r.status,
    coalesce(nullif(trim(p.razao_social), ''), p.nome)
  from public.cipa_reunioes r
  join public.projetos p on p.id = r.projeto_id
  where r.token_agenda = p_token
  limit 1;
$$;

revoke all on function public.agenda_reuniao(uuid) from public;
grant execute on function public.agenda_reuniao(uuid) to anon, authenticated;


-- ===== 20260927170000_reuniao_log_reescrita =====
-- Corrige o log da reunião ("malformed array literal") e registra a reescrita da ata.
-- text[] || 'literal' faz o Postgres ler o literal como array; array_append evita isso.

alter table public.cipa_reunioes
  add column if not exists motivo_alteracao text;

alter table public.cipa_reuniao_log
  add column if not exists versao_anterior text;

create or replace function public.registrar_log_reuniao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  partes text[] := array[]::text[];
  apos boolean := false;
  motivo text;
begin
  if tg_op = 'INSERT' then
    insert into public.cipa_reuniao_log (reuniao_id, projeto_id, usuario_id, evento, apos_conclusao)
    values (new.id, new.projeto_id, auth.uid(), 'Reunião criada', false);
    return new;
  end if;

  -- O motivo vale só para esta gravação; não fica preso na linha.
  motivo := nullif(btrim(coalesce(new.motivo_alteracao, '')), '');
  new.motivo_alteracao := null;

  apos := old.status = 'concluida';

  if new.data_reuniao is distinct from old.data_reuniao then
    partes := array_append(partes, 'Data alterada');
  end if;
  if new.tipo is distinct from old.tipo then
    partes := array_append(partes, 'Tipo alterado');
  end if;
  -- pauta e sumula guardam o mesmo texto; conta uma vez só.
  if new.pauta is distinct from old.pauta
     or (new.sumula is distinct from old.sumula and new.sumula is distinct from new.pauta) then
    partes := array_append(partes, 'Súmula alterada');
  end if;
  if new.ata is distinct from old.ata then
    partes := array_append(partes, case when apos then 'Ata reescrita' else 'Ata alterada' end);
  end if;
  if new.status is distinct from old.status then
    partes := array_append(
      partes,
      case
        when new.status = 'concluida' then 'Reunião concluída'
        when old.status = 'concluida' then 'Reunião reaberta'
        else 'Situação: ' || coalesce(old.status, '—') || ' → ' || coalesce(new.status, '—')
      end
    );
  end if;

  if coalesce(array_length(partes, 1), 0) = 0 then
    if motivo is null then
      return new;
    end if;
    partes := array_append(partes, 'Reescrita salva');
  end if;

  insert into public.cipa_reuniao_log (
    reuniao_id, projeto_id, usuario_id, evento, detalhe, apos_conclusao, versao_anterior
  )
  values (
    new.id,
    new.projeto_id,
    auth.uid(),
    array_to_string(partes, ' · '),
    motivo,
    apos,
    case when apos and new.ata is distinct from old.ata then old.ata else null end
  );

  return new;
end;
$$;

-- INSERT continua depois da gravação (o log referencia a reunião);
-- UPDATE passa a ser antes, para limpar o motivo na mesma gravação.
drop trigger if exists trg_log_reuniao on public.cipa_reunioes;
drop trigger if exists trg_log_reuniao_insert on public.cipa_reunioes;
drop trigger if exists trg_log_reuniao_update on public.cipa_reunioes;

create trigger trg_log_reuniao_insert
  after insert on public.cipa_reunioes
  for each row
  execute function public.registrar_log_reuniao();

create trigger trg_log_reuniao_update
  before update on public.cipa_reunioes
  for each row
  execute function public.registrar_log_reuniao();

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
  if new.reuniao_id is null and old.reuniao_id is not null then
    v_evento := v_evento || ' desvinculada da reunião';
  elsif new.status is distinct from old.status and new.status = 'concluida' then
    v_evento := v_evento || ' concluída na reunião';
  elsif new.status is distinct from old.status then
    v_evento := v_evento || ': ' || coalesce(old.status, '—') || ' → ' || coalesce(new.status, '—');
  else
    v_evento := v_evento || ' vinculada à reunião';
  end if;

  insert into public.cipa_reuniao_log (reuniao_id, projeto_id, usuario_id, evento, detalhe, apos_conclusao)
  values (
    v_reuniao,
    v_projeto,
    auth.uid(),
    v_evento,
    case when new.status = 'concluida' and new.status is distinct from old.status then new.realizado else null end,
    v_status = 'concluida'
  );

  return coalesce(new, old);
end;
$$;

notify pgrst, 'reload schema';

-- ===== 20260927180000_reuniao_log_so_apos_conclusao.sql =====
-- O histórico da reunião passa a existir só a partir da conclusão:
-- registra a própria conclusão e tudo o que mudar depois dela.
-- Antes disso a reunião é rascunho e não gera log.

create or replace function public.registrar_log_reuniao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  partes text[] := array[]::text[];
  motivo text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  -- O motivo vale só para esta gravação; não fica preso na linha.
  motivo := nullif(btrim(coalesce(new.motivo_alteracao, '')), '');
  new.motivo_alteracao := null;

  if old.status is distinct from 'concluida' then
    if new.status = 'concluida' then
      insert into public.cipa_reuniao_log (reuniao_id, projeto_id, usuario_id, evento, apos_conclusao)
      values (new.id, new.projeto_id, auth.uid(), 'Reunião concluída', false);
    end if;
    return new;
  end if;

  if new.data_reuniao is distinct from old.data_reuniao then
    partes := array_append(partes, 'Data alterada');
  end if;
  if new.tipo is distinct from old.tipo then
    partes := array_append(partes, 'Tipo alterado');
  end if;
  -- pauta e sumula guardam o mesmo texto; conta uma vez só.
  if new.pauta is distinct from old.pauta
     or (new.sumula is distinct from old.sumula and new.sumula is distinct from new.pauta) then
    partes := array_append(partes, 'Súmula alterada');
  end if;
  if new.ata is distinct from old.ata then
    partes := array_append(partes, 'Ata reescrita');
  end if;
  if new.status is distinct from old.status then
    partes := array_append(
      partes,
      case
        when new.status = 'cancelada' then 'Reunião cancelada'
        else 'Reunião reaberta'
      end
    );
  end if;

  if coalesce(array_length(partes, 1), 0) = 0 then
    if motivo is null then
      return new;
    end if;
    partes := array_append(partes, 'Reescrita salva');
  end if;

  insert into public.cipa_reuniao_log (
    reuniao_id, projeto_id, usuario_id, evento, detalhe, apos_conclusao, versao_anterior
  )
  values (
    new.id,
    new.projeto_id,
    auth.uid(),
    array_to_string(partes, ' · '),
    motivo,
    true,
    case when new.ata is distinct from old.ata then old.ata else null end
  );

  return new;
end;
$$;

drop trigger if exists trg_log_reuniao_insert on public.cipa_reunioes;

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

  if v_status is distinct from 'concluida' then
    return coalesce(new, old);
  end if;

  v_evento := 'Ação «' || coalesce(new.titulo, old.titulo) || '»';
  if new.reuniao_id is null and old.reuniao_id is not null then
    v_evento := v_evento || ' desvinculada da reunião';
  elsif new.status is distinct from old.status and new.status = 'concluida' then
    v_evento := v_evento || ' concluída na reunião';
  elsif new.status is distinct from old.status then
    v_evento := v_evento || ': ' || coalesce(old.status, '—') || ' → ' || coalesce(new.status, '—');
  else
    v_evento := v_evento || ' vinculada à reunião';
  end if;

  insert into public.cipa_reuniao_log (reuniao_id, projeto_id, usuario_id, evento, detalhe, apos_conclusao)
  values (
    v_reuniao,
    v_projeto,
    auth.uid(),
    v_evento,
    case when new.status = 'concluida' and new.status is distinct from old.status then new.realizado else null end,
    true
  );

  return coalesce(new, old);
end;
$$;

notify pgrst, 'reload schema';

-- ===== 20260927190000_presenca_padrao_ausente.sql =====
-- A chamada passa a começar com todos ausentes e a gravar todas as linhas, inclusive presentes.
-- Até aqui, sem linha significava presente. Para as reuniões já realizadas não mudarem de sentido,
-- grava "presente" para quem estava no mandato e não tinha linha.
-- O histórico da chamada também passa a valer só depois da conclusão da reunião.

alter table public.cipa_reuniao_presenca disable trigger trg_log_presenca;

insert into public.cipa_reuniao_presenca (reuniao_id, membro_id, situacao)
select r.id, m.id, 'presente'
from public.cipa_reunioes r
join public.cipa_membros m on m.projeto_id = r.projeto_id
where r.status is distinct from 'cancelada'
  and r.data_reuniao <= current_date
  and m.inicio_mandato <= r.data_reuniao
  and coalesce(m.fim_real, m.fim_mandato) >= r.data_reuniao
  and not exists (
    select 1 from public.cipa_reuniao_presenca p
    where p.reuniao_id = r.id and p.membro_id = m.id
  )
on conflict (reuniao_id, membro_id) do nothing;

alter table public.cipa_reuniao_presenca enable trigger trg_log_presenca;

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
  v_antes text;
  v_depois text;
begin
  select r.projeto_id, r.status into v_projeto, v_status
  from public.cipa_reunioes r
  where r.id = coalesce(new.reuniao_id, old.reuniao_id);

  if v_status is distinct from 'concluida' then
    return coalesce(new, old);
  end if;

  select m.nome into v_nome
  from public.cipa_membros m
  where m.id = coalesce(new.membro_id, old.membro_id);

  v_antes := case old.situacao when 'presente' then 'Presente' when 'faltante' then 'Ausente' when 'justificado' then 'Justificado' end;
  v_depois := case new.situacao when 'presente' then 'Presente' when 'faltante' then 'Ausente' when 'justificado' then 'Justificado' end;

  if tg_op = 'DELETE' then
    v_evento := 'Presença removida: ' || coalesce(v_nome, 'membro');
  elsif tg_op = 'INSERT' then
    v_evento := 'Presença de ' || coalesce(v_nome, 'membro') || ': ' || v_depois;
  else
    if new.situacao is not distinct from old.situacao
       and new.justificativa is not distinct from old.justificativa then
      return new;
    end if;
    v_evento := 'Presença de ' || coalesce(v_nome, 'membro') || ': ' || coalesce(v_antes, '—') || ' → ' || v_depois;
    if new.situacao is not distinct from old.situacao then
      v_evento := 'Justificativa de ' || coalesce(v_nome, 'membro') || ' alterada';
    elsif new.justificativa is distinct from old.justificativa then
      v_evento := v_evento || ' · justificativa alterada';
    end if;
  end if;

  insert into public.cipa_reuniao_log (reuniao_id, projeto_id, usuario_id, evento, detalhe, apos_conclusao)
  values (
    coalesce(new.reuniao_id, old.reuniao_id),
    v_projeto,
    auth.uid(),
    v_evento,
    case when tg_op <> 'DELETE' and new.situacao = 'justificado' then new.justificativa else null end,
    true
  );

  return coalesce(new, old);
end;
$$;

notify pgrst, 'reload schema';
