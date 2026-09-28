-- Porte e grau de risco do estabelecimento, para o Quadro I da NR-05.

alter table public.projetos
  add column if not exists quantidade_empregados integer,
  add column if not exists grau_risco smallint;

alter table public.projetos drop constraint if exists projetos_grau_risco_check;
alter table public.projetos
  add constraint projetos_grau_risco_check
  check (grau_risco is null or grau_risco between 1 and 4);

alter table public.projetos drop constraint if exists projetos_quantidade_empregados_check;
alter table public.projetos
  add constraint projetos_quantidade_empregados_check
  check (quantidade_empregados is null or quantidade_empregados >= 0);
