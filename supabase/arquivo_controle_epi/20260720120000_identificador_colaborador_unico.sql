-- Unicidade do identificador (crachá / cartão / biometria) por projeto para colaboradores ativos.
-- Garante que a leitura de um periférico no fornecimento aponte para no máximo um colaborador.

CREATE UNIQUE INDEX IF NOT EXISTS uk_colaboradores_projeto_cracha_ativo
  ON public.colaboradores (projeto_id, numero_cracha)
  WHERE status = true AND numero_cracha IS NOT NULL AND numero_cracha <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uk_colaboradores_projeto_cartao_ativo
  ON public.colaboradores (projeto_id, numero_cartao)
  WHERE status = true AND numero_cartao IS NOT NULL AND numero_cartao <> '';

COMMENT ON INDEX public.uk_colaboradores_projeto_cracha_ativo IS
  'Crachá (código de barras) único por projeto entre colaboradores ativos.';
COMMENT ON INDEX public.uk_colaboradores_projeto_cartao_ativo IS
  'Cartão RFID / identificador biométrico único por projeto entre colaboradores ativos.';
