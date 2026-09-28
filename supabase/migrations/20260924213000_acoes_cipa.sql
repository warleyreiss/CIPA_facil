-- Ações da gestão da CIPA: criar, executar e controlar.

create table if not exists public.acoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  titulo text not null,
  grupo text not null check (grupo in ('validade', 'eleicao', 'habitual')),
  detalhe text,
  prazo date not null,
  status text not null default 'planejada' check (status in ('planejada', 'em_execucao', 'concluida', 'cancelada')),
  origem text,
  criada_em timestamptz not null default now(),
  iniciada_em timestamptz,
  concluida_em timestamptz
);

create unique index if not exists acoes_origem_idx
  on public.acoes (projeto_id, origem)
  where origem is not null;

create index if not exists acoes_projeto_prazo_idx
  on public.acoes (projeto_id, prazo);

grant select, insert, update on public.acoes to authenticated;
grant all on public.acoes to service_role;

alter table public.acoes enable row level security;

create policy "membro lê as ações"
  on public.acoes for select
  to authenticated
  using (public.usuario_acessa_projeto(projeto_id));

create policy "membro cria ação"
  on public.acoes for insert
  to authenticated
  with check (public.usuario_acessa_projeto(projeto_id));

create policy "membro atualiza ação"
  on public.acoes for update
  to authenticated
  using (public.usuario_acessa_projeto(projeto_id))
  with check (public.usuario_acessa_projeto(projeto_id));
