-- Preferências de assinatura digital por projeto, campos de colaborador e logo padrão da assinatura

ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS assinatura_digital_modo text NOT NULL DEFAULT 'PADRAO',
  ADD COLUMN IF NOT EXISTS obrigar_cracha_colaborador boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS obrigar_cartao_colaborador boolean NOT NULL DEFAULT false;

ALTER TABLE public.projetos
  DROP CONSTRAINT IF EXISTS projetos_assinatura_digital_modo_check;

ALTER TABLE public.projetos
  ADD CONSTRAINT projetos_assinatura_digital_modo_check
  CHECK (assinatura_digital_modo IN ('PADRAO', 'CODIGO_BARRAS', 'RFID', 'BIOMETRIA'));

COMMENT ON COLUMN public.projetos.assinatura_digital_modo IS
  'Modo de assinatura no fornecimento: PADRAO (sem assinatura), CODIGO_BARRAS, RFID ou BIOMETRIA.';
COMMENT ON COLUMN public.projetos.obrigar_cracha_colaborador IS
  'Quando true e modo CODIGO_BARRAS, exige numero_cracha no cadastro do colaborador.';
COMMENT ON COLUMN public.projetos.obrigar_cartao_colaborador IS
  'Quando true e modo RFID/BIOMETRIA, exige numero_cartao no cadastro do colaborador.';

-- Projetos que já tinham validação digital ativa passam a RFID
UPDATE public.projetos
SET assinatura_digital_modo = 'RFID'
WHERE validacao_digital = true
  AND assinatura_digital_modo = 'PADRAO';

UPDATE public.projetos
SET validacao_digital = (assinatura_digital_modo <> 'PADRAO');

ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS numero_cracha text,
  ADD COLUMN IF NOT EXISTS numero_cartao text;

COMMENT ON COLUMN public.colaboradores.numero_cracha IS 'Código de barras / crachá para assinatura digital.';
COMMENT ON COLUMN public.colaboradores.numero_cartao IS 'UID do cartão RFID ou identificador biométrico cadastrado.';

ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS usar_logo_padrao_projetos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_padrao_url text;

COMMENT ON COLUMN public.assinaturas.usar_logo_padrao_projetos IS
  'Quando true, a logo_padrao_url é aplicada a todos os projetos da assinatura.';
COMMENT ON COLUMN public.assinaturas.logo_padrao_url IS 'URL da logo padrão compartilhada entre projetos da assinatura.';

ALTER TABLE public.controle_epi
  DROP CONSTRAINT IF EXISTS controle_epi_metodo_check;

ALTER TABLE public.controle_epi
  ADD CONSTRAINT controle_epi_metodo_check
  CHECK (metodo IS NULL OR metodo IN ('CODIGO_BARRAS', 'RFID', 'BIOMETRIA'));

ALTER TABLE public.historico_controle_epi
  DROP CONSTRAINT IF EXISTS historico_controle_epi_metodo_check;

ALTER TABLE public.historico_controle_epi
  ADD CONSTRAINT historico_controle_epi_metodo_check
  CHECK (metodo IS NULL OR metodo IN ('CODIGO_BARRAS', 'RFID', 'BIOMETRIA'));
