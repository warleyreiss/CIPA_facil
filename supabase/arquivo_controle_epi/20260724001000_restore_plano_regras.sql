-- Reconstitui registros de public.plano_regras (limpeza acidental).
-- Fonte: print do Table Editor (stripe_price_id, nome_plano, quantidade_projetos).
-- quantidade_colaboradores / quantidade_epis: convenção do app (0 = ilimitado);
-- INICIANTE usa os fallbacks já documentados no código (10 / 50).

INSERT INTO public.plano_regras (
  stripe_price_id,
  nome_plano,
  quantidade_projetos,
  quantidade_colaboradores,
  quantidade_epis
)
VALUES
  ('price_1TjqDrA5Kdos07snj0r1cTO7', 'INICIANTE', 1, 10, 50),
  ('price_1TjqJvA5Kdos07sngKXrIQVo', 'PRO', 3, 0, 0),
  ('price_1TjqMHA5Kdos07snx0sxHCvw', 'GESTOR', 5, 0, 0),
  ('price_1TjqP4A5Kdos07snpksJeDIF', 'DESENVOLVIMENTO', 2, 0, 0),
  ('price_1TkYgrA5Kdos07snobbn29TJ', 'teste-diario', 10, 0, 0)
ON CONFLICT (stripe_price_id) DO UPDATE SET
  nome_plano = EXCLUDED.nome_plano,
  quantidade_projetos = EXCLUDED.quantidade_projetos,
  quantidade_colaboradores = EXCLUDED.quantidade_colaboradores,
  quantidade_epis = EXCLUDED.quantidade_epis;
