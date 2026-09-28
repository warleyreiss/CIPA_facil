-- Membros e reuniões da CIPA. Datas passadas são permitidas.

create table if not exists public.cipa_membros (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  nome text not null,
  representacao text not null check (representacao in ('organizacao', 'empregados')),
  condicao text not null check (condicao in ('titular', 'suplente')),
  funcao text not null default 'membro' check (funcao in ('membro', 'presidente', 'vice')),
  inicio_mandato date not null,
  fim_mandato date not null,
  situacao text not null default 'em_exercicio' check (situacao in ('em_exercicio', 'afastado', 'encerrado')),
  criado_em timestamptz not null default now()
);

create table if not exists public.cipa_reunioes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  data_reuniao date not null,
  tipo text not null check (tipo in ('ordinaria', 'extraordinaria')),
  pauta text,
  ata text,
  presentes text,
  criado_em timestamptz not null default now()
);

create index if not exists cipa_membros_projeto_idx on public.cipa_membros (projeto_id, inicio_mandato desc);
create index if not exists cipa_reunioes_projeto_idx on public.cipa_reunioes (projeto_id, data_reuniao desc);

grant select, insert, update on public.cipa_membros to authenticated;
grant select, insert, update on public.cipa_reunioes to authenticated;
grant all on public.cipa_membros to service_role;
grant all on public.cipa_reunioes to service_role;

alter table public.cipa_membros enable row level security;
alter table public.cipa_reunioes enable row level security;

create policy "membro lê os membros da cipa"
  on public.cipa_membros for select to authenticated
  using (public.usuario_acessa_projeto(projeto_id));

create policy "membro cria membro da cipa"
  on public.cipa_membros for insert to authenticated
  with check (public.usuario_acessa_projeto(projeto_id));

create policy "membro atualiza membro da cipa"
  on public.cipa_membros for update to authenticated
  using (public.usuario_acessa_projeto(projeto_id))
  with check (public.usuario_acessa_projeto(projeto_id));

create policy "membro lê as reuniões"
  on public.cipa_reunioes for select to authenticated
  using (public.usuario_acessa_projeto(projeto_id));

create policy "membro cria reunião"
  on public.cipa_reunioes for insert to authenticated
  with check (public.usuario_acessa_projeto(projeto_id));

create policy "membro atualiza reunião"
  on public.cipa_reunioes for update to authenticated
  using (public.usuario_acessa_projeto(projeto_id))
  with check (public.usuario_acessa_projeto(projeto_id));
