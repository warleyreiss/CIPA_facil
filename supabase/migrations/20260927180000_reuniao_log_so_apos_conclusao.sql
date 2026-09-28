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
