-- Correção de encoding + enriquecimento do catálogo mestre.
-- Usa U&'...' para caracteres acentuados (evita corrupção no pipe do PowerShell).
-- Idempotente.

-- Colete de sinalização: equipamento auxiliar, sem exigência de CA.
UPDATE public.epi_catalogo
SET obrigatorio_ca = false
WHERE descricao ILIKE 'COLETE DE SINALIZ%'
  AND obrigatorio_ca = true;

-- Remove inserções corrompidas por encoding (se existirem).
DELETE FROM public.catalogo_tamanhos
WHERE descricao LIKE '%?%';

DELETE FROM public.epi_catalogo
WHERE descricao LIKE '%?%'
  AND descricao NOT LIKE 'DEMO %';

-- Novos tipos de equipamento
INSERT INTO public.epi_catalogo (descricao, classificacao, guia_tamanho_catalogo, obrigatorio_ca)
SELECT v.descricao, v.classificacao, v.guia, v.obrigatorio_ca
FROM (
  VALUES
    (U&'TOUCA DE MALHA PARA SOLDADOR', U&'CABE\00C7A', 1, true),
    (U&'PROTETOR DE NUCA PARA SOLDADOR', U&'CABE\00C7A', 1, true),
    (U&'BON\00C9 DE ABRIGO SOLAR', U&'CABE\00C7A', 1, false),
    (U&'ABAFADOR TIPO CONCHA PARA CAPACETE', 'AUDITIVA', 1, true),
    (U&'M\00C1SCARA RESPIRAT\00D3RIA PFF1', U&'RESPIRAT\00D3RIA', 2, true),
    (U&'M\00C1SCARA RESPIRAT\00D3RIA PFF3', U&'RESPIRAT\00D3RIA', 2, true),
    (U&'RESPIRADOR SEMI-FACIAL', U&'RESPIRAT\00D3RIA', 2, true),
    (U&'RESPIRADOR FACIAL COMPLETO', U&'RESPIRAT\00D3RIA', 2, true),
    (U&'CARTUCHO FILTRO MEC\00C2NICO P2', U&'RESPIRAT\00D3RIA', 1, true),
    (U&'\00D3CULOS DE PROTE\00C7\00C3O CONTRA RAIOS UV', 'OLHOS E FACE', 1, true),
    (U&'LUVA DESCART\00C1VEL EM NITRILO', 'MEMBROS SUPERIORES', 2, true),
    (U&'LUVA DESCART\00C1VEL EM L\00C1TEX', 'MEMBROS SUPERIORES', 2, true),
    ('LUVA ANTICORTE', 'MEMBROS SUPERIORES', 2, true),
    ('LUVA DE SOLDADOR EM COURO', 'MEMBROS SUPERIORES', 2, true),
    ('MANGOTE DE RASPA', 'MEMBROS SUPERIORES', 1, true),
    (U&'LUVA DE ALGOD\00C3O (TRICOTADA)', 'MEMBROS SUPERIORES', 2, false),
    (U&'CANELEIRA DE PROTE\00C7\00C3O', 'MEMBROS INFERIORES', 1, true),
    (U&'MEIA DE SEGURAN\00C7A T\00C9RMICA', 'MEMBROS INFERIORES', 5, false),
    (U&'CAL\00C7A DE RASPA PARA SOLDADOR', 'CORPO INTEIRO', 4, true),
    (U&'ROUPA DE PROTE\00C7\00C3O CONTRA CHAMAS', 'CORPO INTEIRO', 3, true),
    ('CAMISA DE ALTA VISIBILIDADE', 'CORPO INTEIRO', 3, false),
    (U&'CAL\00C7A DE ALTA VISIBILIDADE', 'CORPO INTEIRO', 4, false),
    (U&'AVENTAL DE PVC IMPERME\00C1VEL', 'TRONCO', 1, true),
    ('DESCENSOR PARA CORDA', 'QUEDAS', 1, true),
    (U&'MOSQUET\00C3O DE SEGURAN\00C7A', 'QUEDAS', 1, true),
    ('CINTO DE FERRAMENTAS', 'OUTROS', 2, false)
) AS v(descricao, classificacao, guia, obrigatorio_ca)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.epi_catalogo ec
  WHERE upper(trim(ec.descricao)) = upper(trim(v.descricao))
);

-- Novos tamanhos comerciais
INSERT INTO public.catalogo_tamanhos (guia_tamanho, descricao)
SELECT v.guia, v.descricao
FROM (
  VALUES
    (2, 'PP'),
    (2, 'XG'),
    (2, 'EXG'),
    (2, U&'N\00BA 6'),
    (2, U&'N\00BA 7'),
    (2, U&'N\00BA 8'),
    (2, U&'N\00BA 9'),
    (2, U&'N\00BA 10'),
    (2, U&'N\00BA 11'),
    (3, U&'\00DANICO'),
    (4, U&'N\00BA 56'),
    (4, U&'N\00BA 58')
) AS v(guia, descricao)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.catalogo_tamanhos ct
  WHERE ct.guia_tamanho = v.guia
    AND upper(trim(ct.descricao)) = upper(trim(v.descricao))
);
