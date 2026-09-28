-- Corrige rotina de entrada/estorno de estoque:
-- - valida projeto/fornecedor/EPI/qtd/preço na RPC de entrada
-- - grava auditoria ENTRADA em estoque_movimentacoes
-- - estorno com checar_acesso_projeto e bloqueio de saldo negativo
-- - acesso nas RPCs de ajuste/devolução
-- - revoga grant anon da entrada

-- ── 1. Tipo ENTRADA na auditoria ──
ALTER TABLE public.estoque_movimentacoes
  DROP CONSTRAINT IF EXISTS estoque_movimentacoes_tipo_check;

ALTER TABLE public.estoque_movimentacoes
  ADD CONSTRAINT estoque_movimentacoes_tipo_check
  CHECK (tipo IN (
    'ENTRADA',
    'AJUSTE',
    'ESTORNO_ENTRADA',
    'DEVOLUCAO',
    'FORNECIMENTO',
    'ESTORNO_FORNECIMENTO'
  ));

-- ── 2. Entrada de NF (validada + auditoria) ──
CREATE OR REPLACE FUNCTION public.processar_entrada_estoque(
  p_projeto_id uuid,
  p_fornecedor_id uuid,
  p_nota_fiscal text,
  p_data_entrada date,
  p_itens jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item RECORD;
  v_saldo integer;
  v_novo integer;
  v_entrada_id uuid;
  v_rows integer;
  v_nf text;
BEGIN
  IF p_projeto_id IS NULL OR NOT public.checar_acesso_projeto(p_projeto_id) THEN
    RAISE EXCEPTION 'Acesso negado ao projeto';
  END IF;

  v_nf := trim(coalesce(p_nota_fiscal, ''));
  IF v_nf = '' THEN
    RAISE EXCEPTION 'Nota fiscal obrigatória';
  END IF;

  IF p_data_entrada IS NULL THEN
    RAISE EXCEPTION 'Data de entrada obrigatória';
  END IF;

  IF p_fornecedor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.fornecedores f
    WHERE f.id = p_fornecedor_id
      AND f.projeto_id = p_projeto_id
  ) THEN
    RAISE EXCEPTION 'Fornecedor inválido para este projeto';
  END IF;

  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) < 1 THEN
    RAISE EXCEPTION 'Informe ao menos 1 item na entrada';
  END IF;

  FOR item IN
    SELECT *
    FROM jsonb_to_recordset(p_itens)
      AS x(epi_id uuid, quantidade int, valor_unitario numeric)
  LOOP
    IF item.epi_id IS NULL THEN
      RAISE EXCEPTION 'Item sem equipamento (epi_id)';
    END IF;

    IF item.quantidade IS NULL OR item.quantidade < 1 THEN
      RAISE EXCEPTION 'Quantidade inválida para o EPI %', item.epi_id;
    END IF;

    IF item.valor_unitario IS NULL OR item.valor_unitario < 0 THEN
      RAISE EXCEPTION 'Preço unitário inválido para o EPI %', item.epi_id;
    END IF;

    SELECT coalesce(e.estoque_atual, 0)
    INTO v_saldo
    FROM public.epis e
    WHERE e.id = item.epi_id
      AND e.projeto_id = p_projeto_id
      AND e.status = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'EPI % não pertence a este projeto ou está inativo', item.epi_id;
    END IF;

    INSERT INTO public.registro_entradas (
      projeto_id,
      fornecedor_id,
      nota_fiscal,
      data_entrada,
      epi_id,
      quantidade,
      valor_unitario
    ) VALUES (
      p_projeto_id,
      p_fornecedor_id,
      v_nf,
      p_data_entrada,
      item.epi_id,
      item.quantidade,
      item.valor_unitario
    )
    RETURNING id INTO v_entrada_id;

    v_novo := v_saldo + item.quantidade;

    UPDATE public.epis
    SET
      estoque_atual = v_novo,
      valor_unitario_atual = item.valor_unitario,
      updated_at = now()
    WHERE id = item.epi_id
      AND projeto_id = p_projeto_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'Falha ao atualizar estoque do EPI %', item.epi_id;
    END IF;

    INSERT INTO public.estoque_movimentacoes (
      projeto_id,
      epi_id,
      tipo,
      quantidade,
      saldo_anterior,
      saldo_posterior,
      motivo,
      registro_entrada_id
    ) VALUES (
      p_projeto_id,
      item.epi_id,
      'ENTRADA',
      item.quantidade,
      v_saldo,
      v_novo,
      'Entrada NF ' || v_nf,
      v_entrada_id
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.processar_entrada_estoque(uuid, uuid, text, date, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.processar_entrada_estoque(uuid, uuid, text, date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.processar_entrada_estoque(uuid, uuid, text, date, jsonb) TO service_role;

-- ── 3. Estorno com membership + bloqueio de negativo ──
CREATE OR REPLACE FUNCTION public.fn_estornar_entrada_estoque(
  p_entrada_id uuid,
  p_motivo text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entrada public.registro_entradas%ROWTYPE;
  v_saldo integer;
  v_novo integer;
BEGIN
  SELECT * INTO v_entrada
  FROM public.registro_entradas
  WHERE id = p_entrada_id
  FOR UPDATE;

  IF v_entrada.id IS NULL THEN
    RAISE EXCEPTION 'Entrada não encontrada';
  END IF;

  IF NOT public.checar_acesso_projeto(v_entrada.projeto_id) THEN
    RAISE EXCEPTION 'Acesso negado ao projeto desta entrada';
  END IF;

  SELECT coalesce(estoque_atual, 0)
  INTO v_saldo
  FROM public.epis
  WHERE id = v_entrada.epi_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EPI da entrada não encontrado';
  END IF;

  v_novo := v_saldo - v_entrada.quantidade;
  IF v_novo < 0 THEN
    RAISE EXCEPTION
      'Estorno não permitido: saldo ficaria negativo (saldo atual %, quantidade da entrada %)',
      v_saldo, v_entrada.quantidade;
  END IF;

  UPDATE public.epis
  SET estoque_atual = v_novo,
      updated_at = now()
  WHERE id = v_entrada.epi_id;

  INSERT INTO public.estoque_movimentacoes (
    projeto_id, epi_id, tipo, quantidade,
    saldo_anterior, saldo_posterior, motivo, registro_entrada_id
  ) VALUES (
    v_entrada.projeto_id,
    v_entrada.epi_id,
    'ESTORNO_ENTRADA',
    v_entrada.quantidade,
    v_saldo,
    v_novo,
    coalesce(
      nullif(trim(p_motivo), ''),
      'Estorno NF ' || coalesce(v_entrada.nota_fiscal, '')
    ),
    v_entrada.id
  );

  DELETE FROM public.registro_entradas WHERE id = p_entrada_id;
END;
$$;

-- ── 4. Ajuste: exige membership ──
CREATE OR REPLACE FUNCTION public.fn_ajustar_estoque_epi(
  p_epi_id uuid,
  p_quantidade_delta integer,
  p_motivo text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_projeto_id uuid;
  v_saldo integer;
  v_novo integer;
BEGIN
  IF p_quantidade_delta = 0 THEN
    RAISE EXCEPTION 'Quantidade de ajuste não pode ser zero';
  END IF;

  SELECT projeto_id, coalesce(estoque_atual, 0)
  INTO v_projeto_id, v_saldo
  FROM public.epis
  WHERE id = p_epi_id AND status = true
  FOR UPDATE;

  IF v_projeto_id IS NULL THEN
    RAISE EXCEPTION 'EPI não encontrado ou inativo';
  END IF;

  IF NOT public.checar_acesso_projeto(v_projeto_id) THEN
    RAISE EXCEPTION 'Acesso negado ao projeto deste EPI';
  END IF;

  v_novo := v_saldo + p_quantidade_delta;
  IF v_novo < 0 THEN
    RAISE EXCEPTION
      'Ajuste não permitido: saldo ficaria negativo (saldo atual %, delta %)',
      v_saldo, p_quantidade_delta;
  END IF;

  UPDATE public.epis
  SET estoque_atual = v_novo,
      updated_at = now()
  WHERE id = p_epi_id;

  INSERT INTO public.estoque_movimentacoes (
    projeto_id, epi_id, tipo, quantidade,
    saldo_anterior, saldo_posterior, motivo
  ) VALUES (
    v_projeto_id, p_epi_id, 'AJUSTE', abs(p_quantidade_delta),
    v_saldo, v_novo, p_motivo
  );
END;
$$;

-- ── 5. Devolução: exige membership ──
CREATE OR REPLACE FUNCTION public.fn_devolver_epi_estoque(
  p_projeto_id uuid,
  p_epi_id uuid,
  p_colaborador_id uuid,
  p_quantidade integer,
  p_observacao text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo integer;
  v_novo integer;
BEGIN
  IF NOT public.checar_acesso_projeto(p_projeto_id) THEN
    RAISE EXCEPTION 'Acesso negado ao projeto';
  END IF;

  IF p_quantidade IS NULL OR p_quantidade < 1 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  SELECT coalesce(estoque_atual, 0)
  INTO v_saldo
  FROM public.epis
  WHERE id = p_epi_id
    AND projeto_id = p_projeto_id
    AND status = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EPI não encontrado neste projeto';
  END IF;

  v_novo := v_saldo + p_quantidade;

  UPDATE public.epis
  SET estoque_atual = v_novo,
      updated_at = now()
  WHERE id = p_epi_id;

  INSERT INTO public.estoque_movimentacoes (
    projeto_id, epi_id, tipo, quantidade,
    saldo_anterior, saldo_posterior, motivo, colaborador_id
  ) VALUES (
    p_projeto_id, p_epi_id, 'DEVOLUCAO', p_quantidade,
    v_saldo, v_novo, p_observacao, p_colaborador_id
  );
END;
$$;

-- ── 6. Texto de ajuda alinhado ao comportamento real ──
UPDATE public.suporte_orientacoes
SET descricao =
  E'Em Equipamentos → opções de estoque → Estornar, selecione a entrada registrada por NF e informe o motivo.\n\n'
  || E'O estorno:\n'
  || E'• Remove o registro da entrada\n'
  || E'• Subtrai a quantidade do saldo atual do EPI\n'
  || E'• Registra auditoria do tipo ESTORNO_ENTRADA\n'
  || E'• Falha se o saldo ficaria negativo (já houve saídas/consumo além do estornado)\n'
  || E'• Só é permitido para membros do projeto da entrada\n\n'
  || E'Use para NF duplicada, quantidade errada ou entrada no EPI/tamanho incorreto. Não confundir com estorno de fornecimento ao colaborador — esse está no Controle EPI.'
WHERE titulo = 'Como estornar uma entrada de estoque?';
