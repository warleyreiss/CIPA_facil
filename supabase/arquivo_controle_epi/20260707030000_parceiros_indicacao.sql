-- Programa de indicação: lojas de EPI (parceiros) indicam clientes.
-- Link de exemplo: https://seusite.com/?ref=CODIGO_DO_PARCEIRO
-- No cadastro (origem DONO), os dados do parceiro viram o 1º fornecedor do projeto.

CREATE TABLE IF NOT EXISTS public.parceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  razao_social text NOT NULL,
  nome_contato text,
  email_contato text,
  telefone_contato text,
  cnpj text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parceiros_codigo_unique UNIQUE (codigo),
  CONSTRAINT parceiros_codigo_format CHECK (codigo ~ '^[A-Za-z0-9_-]{2,40}$')
);

COMMENT ON TABLE public.parceiros IS 'Lojas de EPI parceiras do programa de indicação (cadastro manual no Supabase).';
COMMENT ON COLUMN public.parceiros.codigo IS 'Código curto do link (/ref/CODIGO ou /r/CODIGO). Prefira 4-8 caracteres para QR/cartão. Ex.: protsp, loja01.';

CREATE INDEX IF NOT EXISTS idx_parceiros_codigo_lower ON public.parceiros (lower(trim(codigo)));
CREATE INDEX IF NOT EXISTS idx_parceiros_ativo ON public.parceiros (ativo) WHERE ativo = true;

ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS parceiro_id uuid REFERENCES public.parceiros(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fornecedores_parceiro ON public.fornecedores (parceiro_id);

COMMENT ON COLUMN public.fornecedores.parceiro_id IS 'Preenchido quando o fornecedor foi criado automaticamente por indicação de parceiro.';

-- Copia dados do parceiro para fornecedores do projeto (idempotente por projeto + parceiro).
CREATE OR REPLACE FUNCTION public.criar_fornecedor_de_parceiro(
  p_projeto_id uuid,
  p_parceiro_codigo text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parceiro public.parceiros%ROWTYPE;
  v_fornecedor_id uuid;
  v_codigo text;
BEGIN
  v_codigo := lower(trim(p_parceiro_codigo));

  IF p_projeto_id IS NULL OR v_codigo IS NULL OR v_codigo = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_parceiro
  FROM public.parceiros
  WHERE lower(trim(codigo)) = v_codigo
    AND ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT f.id INTO v_fornecedor_id
  FROM public.fornecedores f
  WHERE f.projeto_id = p_projeto_id
    AND f.parceiro_id = v_parceiro.id
  LIMIT 1;

  IF FOUND THEN
    RETURN v_fornecedor_id;
  END IF;

  INSERT INTO public.fornecedores (
    projeto_id,
    razao_social,
    nome_contato,
    email_contato,
    telefone_contato,
    parceiro_id,
    status
  ) VALUES (
    p_projeto_id,
    v_parceiro.razao_social,
    v_parceiro.nome_contato,
    v_parceiro.email_contato,
    v_parceiro.telefone_contato,
    v_parceiro.id,
    '1'
  )
  RETURNING id INTO v_fornecedor_id;

  RETURN v_fornecedor_id;
END;
$$;

-- Fallback: aplica indicação após login (ex.: OAuth Google) se ainda não existir fornecedor.
CREATE OR REPLACE FUNCTION public.aplicar_indicacao_parceiro(p_parceiro_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_projeto_id uuid;
  v_fornecedor_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  END IF;

  SELECT mp.projeto_id INTO v_projeto_id
  FROM public.membro_projetos mp
  WHERE mp.usuario_id = v_user_id
    AND mp.funcao = 'GESTOR'
    AND mp.status = true
  ORDER BY mp.created_at NULLS LAST
  LIMIT 1;

  IF v_projeto_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'projeto_nao_encontrado');
  END IF;

  v_fornecedor_id := public.criar_fornecedor_de_parceiro(v_projeto_id, p_parceiro_codigo);

  IF v_fornecedor_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'parceiro_invalido_ou_inativo');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'fornecedor_id', v_fornecedor_id,
    'projeto_id', v_projeto_id
  );
END;
$$;

-- Integra ao cadastro do gestor (dono) na criação do projeto.
CREATE OR REPLACE FUNCTION public.novo_registro_usuario_gestor() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assinatura_id uuid;
    v_nome_completo text;
    v_cnpj text;
    v_projeto_id uuid;
    v_assinatura_tipo text;
    v_parceiro_codigo text;
BEGIN
    IF COALESCE(NEW.raw_user_meta_data->>'origem_cadastro', '') <> 'DONO' THEN
        RETURN NEW;
    END IF;

    IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    v_assinatura_id := (NEW.raw_user_meta_data->>'assinatura_id')::uuid;
    v_nome_completo := COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Meu Projeto');
    v_cnpj          := NEW.raw_user_meta_data->>'cnpj';
    v_assinatura_tipo := COALESCE(NEW.raw_user_meta_data->>'assinatura_tipo', 'AUTONOMO');
    v_parceiro_codigo := NULLIF(trim(NEW.raw_user_meta_data->>'parceiro_codigo'), '');

    IF v_assinatura_id IS NULL THEN
        INSERT INTO public.assinaturas (plano_status, assinatura_tipo, plano_tipo, proprietario_id)
        VALUES ('active', v_assinatura_tipo, 'INICIANTE', NEW.id)
        RETURNING id INTO v_assinatura_id;
    ELSE
        UPDATE public.assinaturas
        SET proprietario_id = NEW.id
        WHERE id = v_assinatura_id AND proprietario_id IS NULL;
    END IF;

    INSERT INTO public.usuarios (id, assinatura_id, email, nome_completo, status)
    VALUES (NEW.id, v_assinatura_id, NEW.email, v_nome_completo, true);

    INSERT INTO public.projetos (assinatura_id, nome, cnpj, status)
    VALUES (v_assinatura_id, v_nome_completo, v_cnpj, true)
    RETURNING id INTO v_projeto_id;

    INSERT INTO public.membro_projetos (assinatura_id, usuario_id, projeto_id, funcao, status)
    VALUES (v_assinatura_id, NEW.id, v_projeto_id, 'GESTOR', true);

    IF v_parceiro_codigo IS NOT NULL THEN
        PERFORM public.criar_fornecedor_de_parceiro(v_projeto_id, v_parceiro_codigo);
    END IF;

    RETURN NEW;
END;
$$;

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

-- Parceiros: cadastro manual via painel/service_role; leitura pública só do código (validação opcional no front).
CREATE POLICY "parceiros_select_ativos"
  ON public.parceiros
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

GRANT SELECT ON TABLE public.parceiros TO anon, authenticated;
GRANT ALL ON TABLE public.parceiros TO service_role;

GRANT EXECUTE ON FUNCTION public.criar_fornecedor_de_parceiro(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.aplicar_indicacao_parceiro(text) TO authenticated;

-- Exemplo de cadastro manual (execute no SQL Editor do Supabase):
-- INSERT INTO public.parceiros (codigo, razao_social, nome_contato, email_contato, telefone_contato, cnpj, observacoes)
-- VALUES (
--   'prot-spray-epi',
--   'PROTSPRAY - EQUIPAMENTOS DE PROTECAO LTDA',
--   'João Vendas',
--   'vendas@protspray.com.br',
--   '(11) 99999-9999',
--   '02915532000184',
--   'Parceiro piloto — região SP'
-- );
