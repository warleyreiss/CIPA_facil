-- Operações complementares de estoque: ajuste, estorno de entrada, devolução

CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
    epi_id uuid NOT NULL REFERENCES public.epis(id) ON DELETE CASCADE,
    tipo text NOT NULL CHECK (tipo IN ('AJUSTE', 'ESTORNO_ENTRADA', 'DEVOLUCAO')),
    quantidade integer NOT NULL CHECK (quantidade > 0),
    saldo_anterior integer,
    saldo_posterior integer,
    motivo text,
    colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
    registro_entrada_id uuid REFERENCES public.registro_entradas(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estoque_mov_projeto ON public.estoque_movimentacoes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_epi ON public.estoque_movimentacoes(epi_id);

ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_movimentacoes_select_membro"
    ON public.estoque_movimentacoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.membro_projetos mp
            WHERE mp.projeto_id = estoque_movimentacoes.projeto_id
              AND mp.usuario_id = auth.uid()
              AND mp.status = true
        )
    );

CREATE POLICY "estoque_movimentacoes_insert_membro"
    ON public.estoque_movimentacoes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.membro_projetos mp
            WHERE mp.projeto_id = estoque_movimentacoes.projeto_id
              AND mp.usuario_id = auth.uid()
              AND mp.status = true
        )
    );

-- Ajuste manual (+/-) no saldo
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

    SELECT projeto_id, COALESCE(estoque_atual, 0)
    INTO v_projeto_id, v_saldo
    FROM public.epis
    WHERE id = p_epi_id AND status = true;

    IF v_projeto_id IS NULL THEN
        RAISE EXCEPTION 'EPI não encontrado ou inativo';
    END IF;

    v_novo := v_saldo + p_quantidade_delta;

    UPDATE public.epis
    SET estoque_atual = v_novo,
        updated_at = now()
    WHERE id = p_epi_id;

    INSERT INTO public.estoque_movimentacoes (
        projeto_id, epi_id, tipo, quantidade,
        saldo_anterior, saldo_posterior, motivo
    ) VALUES (
        v_projeto_id, p_epi_id, 'AJUSTE', ABS(p_quantidade_delta),
        v_saldo, v_novo, p_motivo
    );
END;
$$;

-- Estorna uma entrada registrada (NF)
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
    WHERE id = p_entrada_id;

    IF v_entrada.id IS NULL THEN
        RAISE EXCEPTION 'Entrada não encontrada';
    END IF;

    SELECT COALESCE(estoque_atual, 0) INTO v_saldo
    FROM public.epis WHERE id = v_entrada.epi_id;

    v_novo := v_saldo - v_entrada.quantidade;

    UPDATE public.epis
    SET estoque_atual = v_novo,
        updated_at = now()
    WHERE id = v_entrada.epi_id;

    INSERT INTO public.estoque_movimentacoes (
        projeto_id, epi_id, tipo, quantidade,
        saldo_anterior, saldo_posterior, motivo, registro_entrada_id
    ) VALUES (
        v_entrada.projeto_id, v_entrada.epi_id, 'ESTORNO_ENTRADA', v_entrada.quantidade,
        v_saldo, v_novo, COALESCE(p_motivo, 'Estorno NF ' || COALESCE(v_entrada.nota_fiscal, '')),
        v_entrada.id
    );

    DELETE FROM public.registro_entradas WHERE id = p_entrada_id;
END;
$$;

-- Devolução do colaborador para o estoque
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
    IF p_quantidade IS NULL OR p_quantidade < 1 THEN
        RAISE EXCEPTION 'Quantidade inválida';
    END IF;

    SELECT COALESCE(estoque_atual, 0) INTO v_saldo
    FROM public.epis
    WHERE id = p_epi_id AND projeto_id = p_projeto_id AND status = true;

    IF v_saldo IS NULL AND NOT FOUND THEN
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

GRANT ALL ON TABLE public.estoque_movimentacoes TO authenticated;
GRANT ALL ON FUNCTION public.fn_ajustar_estoque_epi(uuid, integer, text) TO authenticated;
GRANT ALL ON FUNCTION public.fn_estornar_entrada_estoque(uuid, text) TO authenticated;
GRANT ALL ON FUNCTION public.fn_devolver_epi_estoque(uuid, uuid, uuid, integer, text) TO authenticated;
