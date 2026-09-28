-- ÚNICO não é medida de vestimenta superior (guia 3).
-- Remapeia referências (se houver) para INDEFINIDO e remove o tamanho.

DO $$
DECLARE
  v_unico uuid;
  v_indefinido uuid;
  merge_rec record;
BEGIN
  SELECT id INTO v_unico
  FROM public.catalogo_tamanhos
  WHERE guia_tamanho = 3
    AND upper(trim(descricao)) IN ('ÚNICO', 'UNICO')
  LIMIT 1;

  IF v_unico IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_indefinido
  FROM public.catalogo_tamanhos
  WHERE guia_tamanho = 3
    AND upper(trim(descricao)) = 'INDEFINIDO'
  LIMIT 1;

  IF v_indefinido IS NULL THEN
    INSERT INTO public.catalogo_tamanhos (guia_tamanho, descricao)
    VALUES (3, 'INDEFINIDO')
    RETURNING id INTO v_indefinido;
  END IF;

  UPDATE public.colaboradores
  SET tamanho_vestimenta_sup_id = v_indefinido
  WHERE tamanho_vestimenta_sup_id = v_unico;

  UPDATE public.epis e
  SET catalogo_tamanho_id = v_indefinido
  WHERE e.catalogo_tamanho_id = v_unico
    AND NOT EXISTS (
      SELECT 1
      FROM public.epis e2
      WHERE e2.projeto_id = e.projeto_id
        AND e2.epi_catalogo_id = e.epi_catalogo_id
        AND e2.catalogo_tamanho_id = v_indefinido
        AND e2.id IS DISTINCT FROM e.id
    );

  FOR merge_rec IN
    SELECT e_old.id AS old_id, e_new.id AS new_id
    FROM public.epis e_old
    JOIN public.epis e_new
      ON e_new.projeto_id = e_old.projeto_id
     AND e_new.epi_catalogo_id = e_old.epi_catalogo_id
     AND e_new.catalogo_tamanho_id = v_indefinido
     AND e_new.id IS DISTINCT FROM e_old.id
    WHERE e_old.catalogo_tamanho_id = v_unico
  LOOP
    UPDATE public.controle_epi SET epi_id = merge_rec.new_id WHERE epi_id = merge_rec.old_id;
    UPDATE public.historico_controle_epi SET epi_id = merge_rec.new_id WHERE epi_id = merge_rec.old_id;
    UPDATE public.estoque_movimentacoes SET epi_id = merge_rec.new_id WHERE epi_id = merge_rec.old_id;
    UPDATE public.registro_entradas SET epi_id = merge_rec.new_id WHERE epi_id = merge_rec.old_id;

    UPDATE public.epis dest
    SET
      estoque_atual = COALESCE(dest.estoque_atual, 0) + COALESCE(origem.estoque_atual, 0),
      estoque_minimo = GREATEST(COALESCE(dest.estoque_minimo, 0), COALESCE(origem.estoque_minimo, 0)),
      estoque_ideal = GREATEST(COALESCE(dest.estoque_ideal, 0), COALESCE(origem.estoque_ideal, 0))
    FROM public.epis origem
    WHERE dest.id = merge_rec.new_id
      AND origem.id = merge_rec.old_id;

    DELETE FROM public.epis WHERE id = merge_rec.old_id;
  END LOOP;

  DELETE FROM public.catalogo_tamanhos WHERE id = v_unico;
END $$;
