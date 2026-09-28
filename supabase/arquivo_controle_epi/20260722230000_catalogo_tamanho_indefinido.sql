-- Tamanho INDEFINIDO por guia — fallback quando a planilha traz guia incompatível com o EPI.
INSERT INTO public.catalogo_tamanhos (guia_tamanho, descricao)
SELECT v.guia, 'INDEFINIDO'
FROM (
  VALUES (1), (2), (3), (4), (5)
) AS v(guia)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.catalogo_tamanhos ct
  WHERE ct.guia_tamanho = v.guia
    AND upper(trim(ct.descricao)) = 'INDEFINIDO'
);
