-- Situação da CIPA no projeto e reservistas na comissão.

alter table public.projetos
  add column if not exists cipa_em_andamento boolean,
  add column if not exists data_inicio_gestao date,
  add column if not exists data_fim_mandato date,
  add column if not exists cipa_maturidade text;

comment on column public.projetos.cipa_em_andamento is
  'Verdadeiro quando o projeto já entrou com CIPA em funcionamento. Falso quando a implantação ainda vai começar.';

alter table public.cipa_membros drop constraint if exists cipa_membros_condicao_check;
alter table public.cipa_membros
  add constraint cipa_membros_condicao_check
  check (condicao in ('titular', 'suplente', 'reservista'));
