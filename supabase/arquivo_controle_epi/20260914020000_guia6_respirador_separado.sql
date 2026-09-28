-- Separa Respirador (guia 6) da Luva (guia 2).
-- Mesmas descrições (P, M, G, GG, XG, INDEFINIDO), IDs distintos —
-- evita match cruzado no fornecimento quando ambos compartilhavam a guia 2.

DO $$
DECLARE
  v_indefinido_g6 uuid;
  r record;
  v_destino uuid;
  v_merge_new uuid;
  v_merge_old uuid;
BEGIN
  -- 1) Seed guia 6
  INSERT INTO public.catalogo_tamanhos (guia_tamanho, descricao)
  SELECT 6, d
  FROM unnest(ARRAY['P', 'M', 'G', 'GG', 'XG', 'INDEFINIDO']) AS d
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.catalogo_tamanhos ct
    WHERE ct.guia_tamanho = 6
      AND upper(trim(ct.descricao)) = upper(trim(d))
  );

  SELECT id INTO v_indefinido_g6
  FROM public.catalogo_tamanhos
  WHERE guia_tamanho = 6
    AND upper(trim(descricao)) = 'INDEFINIDO'
  LIMIT 1;

  IF v_indefinido_g6 IS NULL THEN
    RAISE EXCEPTION 'INDEFINIDO (guia 6) não encontrado após seed.';
  END IF;

  -- 2) Catálogo de EPI: respiradores passam para guia 6
  UPDATE public.epi_catalogo
  SET guia_tamanho_catalogo = 6
  WHERE guia_tamanho_catalogo = 2
    AND (
      upper(descricao) LIKE '%RESPIRADOR%'
      OR upper(classificacao) LIKE '%RESPIRAT%'
    );

  -- 3) Colaboradores: tamanho_respirador_id → equivalente na guia 6
  FOR r IN
    SELECT c.id AS colaborador_id, ct.descricao
    FROM public.colaboradores c
    JOIN public.catalogo_tamanhos ct ON ct.id = c.tamanho_respirador_id
    WHERE ct.guia_tamanho = 2
  LOOP
    SELECT id INTO v_destino
    FROM public.catalogo_tamanhos
    WHERE guia_tamanho = 6
      AND upper(trim(descricao)) = upper(trim(r.descricao))
    LIMIT 1;

    UPDATE public.colaboradores
    SET tamanho_respirador_id = COALESCE(v_destino, v_indefinido_g6)
    WHERE id = r.colaborador_id;
  END LOOP;

  -- 4) EPIs cadastrados cujo catálogo agora é guia 6: remapeia tamanho guia 2 → 6
  FOR r IN
    SELECT e.id AS epi_id, e.projeto_id, e.epi_catalogo_id, ct.descricao
    FROM public.epis e
    JOIN public.epi_catalogo ec ON ec.id = e.epi_catalogo_id
    JOIN public.catalogo_tamanhos ct ON ct.id = e.catalogo_tamanho_id
    WHERE ec.guia_tamanho_catalogo = 6
      AND ct.guia_tamanho = 2
  LOOP
    SELECT id INTO v_destino
    FROM public.catalogo_tamanhos
    WHERE guia_tamanho = 6
      AND upper(trim(descricao)) = upper(trim(r.descricao))
    LIMIT 1;

    v_destino := COALESCE(v_destino, v_indefinido_g6);

    SELECT e2.id INTO v_merge_new
    FROM public.epis e2
    WHERE e2.projeto_id = r.projeto_id
      AND e2.epi_catalogo_id = r.epi_catalogo_id
      AND e2.catalogo_tamanho_id = v_destino
      AND e2.id <> r.epi_id
    LIMIT 1;

    IF v_merge_new IS NOT NULL THEN
      v_merge_old := r.epi_id;

      UPDATE public.controle_epi SET epi_id = v_merge_new WHERE epi_id = v_merge_old;
      UPDATE public.historico_controle_epi SET epi_id = v_merge_new WHERE epi_id = v_merge_old;
      UPDATE public.estoque_movimentacoes SET epi_id = v_merge_new WHERE epi_id = v_merge_old;
      UPDATE public.registro_entradas SET epi_id = v_merge_new WHERE epi_id = v_merge_old;

      UPDATE public.epis dest
      SET
        estoque_atual = COALESCE(dest.estoque_atual, 0) + COALESCE(origem.estoque_atual, 0),
        estoque_minimo = GREATEST(COALESCE(dest.estoque_minimo, 0), COALESCE(origem.estoque_minimo, 0)),
        estoque_ideal = GREATEST(COALESCE(dest.estoque_ideal, 0), COALESCE(origem.estoque_ideal, 0))
      FROM public.epis origem
      WHERE dest.id = v_merge_new
        AND origem.id = v_merge_old;

      DELETE FROM public.epis WHERE id = v_merge_old;
    ELSE
      UPDATE public.epis
      SET catalogo_tamanho_id = v_destino
      WHERE id = r.epi_id;
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE public.catalogo_tamanhos IS
  'Catálogo global de tamanhos. Guia 2 = Luva; Guia 6 = Respirador (mesmas letras, IDs distintos).';
