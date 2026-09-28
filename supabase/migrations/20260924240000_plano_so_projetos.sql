-- O plano passa a limitar só a quantidade de projetos.

alter table public.plano_regras
  drop column if exists quantidade_colaboradores,
  drop column if exists quantidade_epis;
