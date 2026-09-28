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
