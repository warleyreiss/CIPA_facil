-- Gestão das eleições da CIPA (NR-05). Rode só neste projeto, quando o Supabase existir.

create table if not exists public.eleicoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  data_termino_mandato date not null,
  data_inicio date not null,
  status text not null default 'em_andamento' check (status in ('em_andamento', 'concluida', 'cancelada')),
  primeira boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.eleicao_etapas (
  id uuid primary key default gen_random_uuid(),
  eleicao_id uuid not null references public.eleicoes (id) on delete cascade,
  codigo text not null,
  ordem integer not null,
  titulo text not null,
  norma text not null,
  data_prevista date not null,
  concluida_em timestamptz,
  observacao text,
  unique (eleicao_id, codigo)
);

create index if not exists eleicoes_projeto_idx on public.eleicoes (projeto_id, criado_em desc);
create index if not exists eleicao_etapas_eleicao_idx on public.eleicao_etapas (eleicao_id, ordem);

create or replace function public.usuario_acessa_projeto(p_projeto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projetos p
    where p.id = p_projeto_id
      and public.usuario_pertence_assinatura(p.assinatura_id)
  );
$$;

create or replace function public.usuario_acessa_eleicao(p_eleicao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.eleicoes e
    where e.id = p_eleicao_id
      and public.usuario_acessa_projeto(e.projeto_id)
  );
$$;

grant select, insert, update on public.eleicoes to authenticated;
grant select, insert, update on public.eleicao_etapas to authenticated;
grant all on public.eleicoes to service_role;
grant all on public.eleicao_etapas to service_role;

alter table public.eleicoes enable row level security;
alter table public.eleicao_etapas enable row level security;

create policy "membro lê as eleições"
  on public.eleicoes for select
  to authenticated
  using (public.usuario_acessa_projeto(projeto_id));

create policy "membro cria eleição"
  on public.eleicoes for insert
  to authenticated
  with check (public.usuario_acessa_projeto(projeto_id));

create policy "membro atualiza eleição"
  on public.eleicoes for update
  to authenticated
  using (public.usuario_acessa_projeto(projeto_id))
  with check (public.usuario_acessa_projeto(projeto_id));

create policy "membro lê as etapas"
  on public.eleicao_etapas for select
  to authenticated
  using (public.usuario_acessa_eleicao(eleicao_id));

create policy "membro cria etapa"
  on public.eleicao_etapas for insert
  to authenticated
  with check (public.usuario_acessa_eleicao(eleicao_id));

create policy "membro atualiza etapa"
  on public.eleicao_etapas for update
  to authenticated
  using (public.usuario_acessa_eleicao(eleicao_id))
  with check (public.usuario_acessa_eleicao(eleicao_id));
