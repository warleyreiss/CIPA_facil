-- NR-05: a CIPA não pode ter o número de representantes reduzido antes do fim do mandato,
-- salvo encerramento das atividades do estabelecimento. Guarda o porte com que o mandato atual começou.

alter table public.projetos
  add column if not exists quadro_mandato_empregados integer,
  add column if not exists quadro_mandato_grau smallint;

alter table public.projetos drop constraint if exists projetos_quadro_mandato_grau_check;
alter table public.projetos
  add constraint projetos_quadro_mandato_grau_check
  check (quadro_mandato_grau is null or quadro_mandato_grau between 1 and 4);

update public.projetos
   set quadro_mandato_empregados = quantidade_empregados,
       quadro_mandato_grau = grau_risco
 where cipa_em_andamento = true
   and data_fim_mandato >= current_date
   and quadro_mandato_empregados is null
   and quantidade_empregados is not null
   and grau_risco is not null;

comment on column public.projetos.quadro_mandato_empregados is
  'Colaboradores com que o mandato atual foi dimensionado. Um quadro menor só vale na próxima eleição.';
comment on column public.projetos.quadro_mandato_grau is
  'Grau de risco com que o mandato atual foi dimensionado.';
