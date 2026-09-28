-- Guia 2 (Luva / Respirador): manter apenas P, M, G, GG, XG e INDEFINIDO.
-- Remove PP, EXG e grades numéricas (Nº 6–11), remapeando referências existentes.

DO $$
DECLARE
  v_indefinido uuid;
  v_origem uuid;
  v_destino uuid;
  v_origem_desc text;
  v_destino_desc text;
  v_map text[][] := ARRAY[
    ARRAY['PP', 'P'],
    ARRAY['EXG', 'XG'],
    ARRAY['Nº 6', 'P'],
    ARRAY['Nº 7', 'M'],
    ARRAY['Nº 8', 'G'],
    ARRAY['Nº 9', 'GG'],
    ARRAY['Nº 10', 'XG'],
    ARRAY['Nº 11', 'XG']
  ];
  i int;
  merge_rec record;
  leftover record;
BEGIN
  INSERT INTO public.catalogo_tamanhos (guia_tamanho, descricao)
  SELECT 2, d
  FROM unnest(ARRAY['P', 'M', 'G', 'GG', 'XG', 'INDEFINIDO']) AS d
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.catalogo_tamanhos ct
    WHERE ct.guia_tamanho = 2
      AND upper(trim(ct.descricao)) = upper(trim(d))
  );

  SELECT id INTO v_indefinido
  FROM public.catalogo_tamanhos
  WHERE guia_tamanho = 2
    AND upper(trim(descricao)) = 'INDEFINIDO'
  LIMIT 1;

  IF v_indefinido IS NULL THEN
    RAISE EXCEPTION 'INDEFINIDO (guia 2) não encontrado após seed.';
  END IF;

  FOR i IN 1 .. array_length(v_map, 1) LOOP
    v_origem_desc := v_map[i][1];
    v_destino_desc := v_map[i][2];

    SELECT id INTO v_origem
    FROM public.catalogo_tamanhos
    WHERE guia_tamanho = 2
      AND upper(trim(descricao)) = upper(trim(v_origem_desc))
    LIMIT 1;

    IF v_origem IS NULL THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_destino
    FROM public.catalogo_tamanhos
    WHERE guia_tamanho = 2
      AND upper(trim(descricao)) = upper(trim(v_destino_desc))
    LIMIT 1;

    v_destino := COALESCE(v_destino, v_indefinido);

    UPDATE public.colaboradores
    SET tamanho_luva_id = v_destino
    WHERE tamanho_luva_id = v_origem;

    UPDATE public.colaboradores
    SET tamanho_respirador_id = v_destino
    WHERE tamanho_respirador_id = v_origem;

    UPDATE public.epis e
    SET catalogo_tamanho_id = v_destino
    WHERE e.catalogo_tamanho_id = v_origem
      AND NOT EXISTS (
        SELECT 1
        FROM public.epis e2
        WHERE e2.projeto_id = e.projeto_id
          AND e2.epi_catalogo_id = e.epi_catalogo_id
          AND e2.catalogo_tamanho_id = v_destino
          AND e2.id IS DISTINCT FROM e.id
      );

    FOR merge_rec IN
      SELECT e_old.id AS old_id, e_new.id AS new_id
      FROM public.epis e_old
      JOIN public.epis e_new
        ON e_new.projeto_id = e_old.projeto_id
       AND e_new.epi_catalogo_id = e_old.epi_catalogo_id
       AND e_new.catalogo_tamanho_id = v_destino
       AND e_new.id IS DISTINCT FROM e_old.id
      WHERE e_old.catalogo_tamanho_id = v_origem
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

    DELETE FROM public.catalogo_tamanhos WHERE id = v_origem;
  END LOOP;

  -- Remove qualquer sobra fora do conjunto canônico
  FOR leftover IN
    SELECT ct.id
    FROM public.catalogo_tamanhos ct
    WHERE ct.guia_tamanho = 2
      AND upper(trim(ct.descricao)) NOT IN ('P', 'M', 'G', 'GG', 'XG', 'INDEFINIDO')
  LOOP
    UPDATE public.colaboradores SET tamanho_luva_id = v_indefinido WHERE tamanho_luva_id = leftover.id;
    UPDATE public.colaboradores SET tamanho_respirador_id = v_indefinido WHERE tamanho_respirador_id = leftover.id;

    UPDATE public.epis e
    SET catalogo_tamanho_id = v_indefinido
    WHERE e.catalogo_tamanho_id = leftover.id
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
      WHERE e_old.catalogo_tamanho_id = leftover.id
    LOOP
      UPDATE public.controle_epi SET epi_id = merge_rec.new_id WHERE epi_id = merge_rec.old_id;
      UPDATE public.historico_controle_epi SET epi_id = merge_rec.new_id WHERE epi_id = merge_rec.old_id;
      UPDATE public.estoque_movimentacoes SET epi_id = merge_rec.new_id WHERE epi_id = merge_rec.old_id;
      UPDATE public.registro_entradas SET epi_id = merge_rec.new_id WHERE epi_id = merge_rec.old_id;
      DELETE FROM public.epis WHERE id = merge_rec.old_id;
    END LOOP;

    DELETE FROM public.catalogo_tamanhos WHERE id = leftover.id;
  END LOOP;
END $$;

COMMENT ON TABLE public.catalogo_tamanhos IS
  'Catálogo global de tamanhos. Guia 2 (Luva): P, M, G, GG, XG, INDEFINIDO.';
