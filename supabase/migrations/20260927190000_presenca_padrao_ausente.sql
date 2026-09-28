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
