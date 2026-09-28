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
