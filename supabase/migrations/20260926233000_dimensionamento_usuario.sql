-- Dimensionamento confirmado no assistente e marca de edição manual.

alter table public.projetos
  add column if not exists quantidade_empregados integer,
  add column if not exists grau_risco smallint,
  add column if not exists cnae text,
  add column if not exists cnae_descricao text,
  add column if not exists razao_social text,
  add column if not exists dimensionamento_efetivos integer,
  add column if not exists dimensionamento_editado_usuario boolean not null default false;

alter table public.projetos drop constraint if exists projetos_grau_risco_check;
alter table public.projetos
  add constraint projetos_grau_risco_check
  check (grau_risco is null or grau_risco between 1 and 4);
