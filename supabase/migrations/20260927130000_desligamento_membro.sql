-- Desligamento e substituição de membro da CIPA (NR-05).
-- fim_mandato continua sendo o fim previsto da vaga. fim_real é o último dia em que a pessoa exerceu.

alter table public.cipa_membros
  add column if not exists fim_real date,
  add column if not exists motivo_desligamento text,
  add column if not exists motivo_descricao text,
  add column if not exists substituido_por uuid references public.cipa_membros (id) on delete set null,
  add column if not exists substitui uuid references public.cipa_membros (id) on delete set null,
  add column if not exists forma_ingresso text;

alter table public.cipa_membros drop constraint if exists cipa_membros_motivo_desligamento_check;
alter table public.cipa_membros
  add constraint cipa_membros_motivo_desligamento_check
  check (
    motivo_desligamento is null
    or motivo_desligamento in (
      'faltas_sem_justificativa',
      'desligamento_organizacao',
      'renuncia',
      'afastamento_definitivo',
      'falecimento',
      'redesignacao_organizacao',
      'outro'
    )
  );

alter table public.cipa_membros drop constraint if exists cipa_membros_forma_ingresso_check;
alter table public.cipa_membros
  add constraint cipa_membros_forma_ingresso_check
  check (
    forma_ingresso is null
    or forma_ingresso in ('eleicao', 'designacao', 'suplente_assumiu', 'eleicao_extraordinaria', 'escolha_titulares')
  );

alter table public.cipa_membros drop constraint if exists cipa_membros_desligamento_completo_check;
alter table public.cipa_membros
  add constraint cipa_membros_desligamento_completo_check
  check (
    situacao <> 'encerrado'
    or fim_real is null
    or (motivo_desligamento is not null and length(trim(coalesce(motivo_descricao, ''))) >= 10)
  );

create index if not exists cipa_membros_substituido_idx on public.cipa_membros (substituido_por);

comment on column public.cipa_membros.fim_mandato is 'Fim previsto do mandato da vaga.';
comment on column public.cipa_membros.fim_real is 'Último dia de exercício quando a pessoa deixou a CIPA antes do fim previsto.';
comment on column public.cipa_membros.motivo_desligamento is 'Motivo do desligamento pela NR-05.';
comment on column public.cipa_membros.motivo_descricao is 'Descrição obrigatória do motivo do desligamento.';
