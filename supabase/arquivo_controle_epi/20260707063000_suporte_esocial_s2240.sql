-- Orientação de suporte: exportação eSocial S-2240

DELETE FROM public.suporte_orientacoes
WHERE titulo = 'Como exportar o gabarito S-2240 para o eSocial?';

INSERT INTO public.suporte_orientacoes (titulo, descricao, link_materiais, link_video)
VALUES (
  'Como exportar o gabarito S-2240 para o eSocial?',
  E'O eSocial exige o evento S-2240 na admissão ou quando há alteração relevante (troca de função, inclusão de EPI na função ou troca de CA).\n\n'
  || E'No menu eSocial, selecione o período (por padrão, o mês atual) e clique em Atualizar. O sistema lista apenas as movimentações que exigem envio — não a rotina diária sem mudança.\n\n'
  || E'Baixe o Excel gabarito ou o CSV em lote. A planilha traz dtIniCond, CPF, matrícula, função, GHE, CAs ativos e o checklist de conformidade pré-preenchido (EPI eficaz, higienização, periodicidade, validade do CA e condições de funcionamento).\n\n'
  || E'Importe o arquivo no seu sistema de folha (Alterdata, Domínio, Prosoft etc.) ou use como guia manual no portal gov.br. Cadastre o CPF de cada colaborador antes da transmissão oficial.\n\n'
  || E'O eSocial aceita lotes com vários trabalhadores, mas gera recibo individual por CPF.',
  'https://www.gov.br/esocial/pt-br',
  NULL
);
