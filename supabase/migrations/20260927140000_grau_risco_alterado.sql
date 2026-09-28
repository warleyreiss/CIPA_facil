-- O quadro de membros não é mais editado à mão. O usuário só pode alterar o grau de risco
-- (ex.: prestador de serviço dentro de empresa de grau maior) e o Quadro I da NR-05 recalcula.

update public.projetos
   set dimensionamento_editado_usuario = false
 where dimensionamento_editado_usuario = true;

comment on column public.projetos.grau_risco is
  'Grau de risco usado no dimensionamento. Vem da atividade principal do CNPJ; pode ser alterado pelo usuário.';
comment on column public.projetos.dimensionamento_editado_usuario is
  'true quando o grau de risco foi alterado pelo usuário e difere do grau da atividade principal do CNPJ.';
comment on column public.projetos.dimensionamento_efetivos is
  'Titulares por lado calculados pelo Quadro I da NR-05 com quantidade_empregados e grau_risco.';
