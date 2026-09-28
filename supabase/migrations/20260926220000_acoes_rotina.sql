-- Ações de correção e prevenção, separadas do processo eleitoral.

alter table public.acoes
  add column if not exists natureza text,
  add column if not exists descricao text,
  add column if not exists membro_id uuid references public.cipa_membros (id) on delete set null,
  add column if not exists data_finalizacao date,
  add column if not exists realizado text;

alter table public.acoes drop constraint if exists acoes_natureza_check;
alter table public.acoes
  add constraint acoes_natureza_check
  check (natureza is null or natureza in ('correcao', 'prevencao'));
