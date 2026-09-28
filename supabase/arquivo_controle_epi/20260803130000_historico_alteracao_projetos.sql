-- Histórico de alterações nas configurações do projeto.
-- Trigger AFTER UPDATE em projetos: registra só campos de configuração que mudaram.

CREATE TABLE IF NOT EXISTS public.historico_alteracao_projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  alterado_por uuid NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  campos_alterados text[] NOT NULL DEFAULT '{}',
  alteracoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hist_alt_projetos_projeto_id
  ON public.historico_alteracao_projetos (projeto_id, created_at DESC);

COMMENT ON TABLE public.historico_alteracao_projetos IS
  'Auditoria de mudanças em configurações da tabela projetos.';

CREATE OR REPLACE FUNCTION public.fn_log_alteracao_projeto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_campos text[] := '{}';
  v_alteracoes jsonb := '{}'::jsonb;
BEGIN
  -- Identidade / fiscal
  IF OLD.nome IS DISTINCT FROM NEW.nome THEN
    v_campos := array_append(v_campos, 'nome');
    v_alteracoes := v_alteracoes || jsonb_build_object('nome', jsonb_build_object('antes', to_jsonb(OLD.nome), 'depois', to_jsonb(NEW.nome)));
  END IF;
  IF OLD.cnpj IS DISTINCT FROM NEW.cnpj THEN
    v_campos := array_append(v_campos, 'cnpj');
    v_alteracoes := v_alteracoes || jsonb_build_object('cnpj', jsonb_build_object('antes', to_jsonb(OLD.cnpj), 'depois', to_jsonb(NEW.cnpj)));
  END IF;
  IF OLD.razao_social IS DISTINCT FROM NEW.razao_social THEN
    v_campos := array_append(v_campos, 'razao_social');
    v_alteracoes := v_alteracoes || jsonb_build_object('razao_social', jsonb_build_object('antes', to_jsonb(OLD.razao_social), 'depois', to_jsonb(NEW.razao_social)));
  END IF;
  IF OLD.inscricao_estadual IS DISTINCT FROM NEW.inscricao_estadual THEN
    v_campos := array_append(v_campos, 'inscricao_estadual');
    v_alteracoes := v_alteracoes || jsonb_build_object('inscricao_estadual', jsonb_build_object('antes', to_jsonb(OLD.inscricao_estadual), 'depois', to_jsonb(NEW.inscricao_estadual)));
  END IF;
  IF OLD.inscricao_municipal IS DISTINCT FROM NEW.inscricao_municipal THEN
    v_campos := array_append(v_campos, 'inscricao_municipal');
    v_alteracoes := v_alteracoes || jsonb_build_object('inscricao_municipal', jsonb_build_object('antes', to_jsonb(OLD.inscricao_municipal), 'depois', to_jsonb(NEW.inscricao_municipal)));
  END IF;
  IF OLD.cnae IS DISTINCT FROM NEW.cnae THEN
    v_campos := array_append(v_campos, 'cnae');
    v_alteracoes := v_alteracoes || jsonb_build_object('cnae', jsonb_build_object('antes', to_jsonb(OLD.cnae), 'depois', to_jsonb(NEW.cnae)));
  END IF;
  IF OLD.regime_tributario IS DISTINCT FROM NEW.regime_tributario THEN
    v_campos := array_append(v_campos, 'regime_tributario');
    v_alteracoes := v_alteracoes || jsonb_build_object('regime_tributario', jsonb_build_object('antes', to_jsonb(OLD.regime_tributario), 'depois', to_jsonb(NEW.regime_tributario)));
  END IF;

  -- Endereço
  IF OLD.logradouro IS DISTINCT FROM NEW.logradouro THEN
    v_campos := array_append(v_campos, 'logradouro');
    v_alteracoes := v_alteracoes || jsonb_build_object('logradouro', jsonb_build_object('antes', to_jsonb(OLD.logradouro), 'depois', to_jsonb(NEW.logradouro)));
  END IF;
  IF OLD.numero IS DISTINCT FROM NEW.numero THEN
    v_campos := array_append(v_campos, 'numero');
    v_alteracoes := v_alteracoes || jsonb_build_object('numero', jsonb_build_object('antes', to_jsonb(OLD.numero), 'depois', to_jsonb(NEW.numero)));
  END IF;
  IF OLD.complemento IS DISTINCT FROM NEW.complemento THEN
    v_campos := array_append(v_campos, 'complemento');
    v_alteracoes := v_alteracoes || jsonb_build_object('complemento', jsonb_build_object('antes', to_jsonb(OLD.complemento), 'depois', to_jsonb(NEW.complemento)));
  END IF;
  IF OLD.bairro IS DISTINCT FROM NEW.bairro THEN
    v_campos := array_append(v_campos, 'bairro');
    v_alteracoes := v_alteracoes || jsonb_build_object('bairro', jsonb_build_object('antes', to_jsonb(OLD.bairro), 'depois', to_jsonb(NEW.bairro)));
  END IF;
  IF OLD.cidade IS DISTINCT FROM NEW.cidade THEN
    v_campos := array_append(v_campos, 'cidade');
    v_alteracoes := v_alteracoes || jsonb_build_object('cidade', jsonb_build_object('antes', to_jsonb(OLD.cidade), 'depois', to_jsonb(NEW.cidade)));
  END IF;
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    v_campos := array_append(v_campos, 'estado');
    v_alteracoes := v_alteracoes || jsonb_build_object('estado', jsonb_build_object('antes', to_jsonb(OLD.estado), 'depois', to_jsonb(NEW.estado)));
  END IF;
  IF OLD.cep IS DISTINCT FROM NEW.cep THEN
    v_campos := array_append(v_campos, 'cep');
    v_alteracoes := v_alteracoes || jsonb_build_object('cep', jsonb_build_object('antes', to_jsonb(OLD.cep), 'depois', to_jsonb(NEW.cep)));
  END IF;
  IF OLD.logo_url IS DISTINCT FROM NEW.logo_url THEN
    v_campos := array_append(v_campos, 'logo_url');
    v_alteracoes := v_alteracoes || jsonb_build_object('logo_url', jsonb_build_object('antes', to_jsonb(OLD.logo_url), 'depois', to_jsonb(NEW.logo_url)));
  END IF;

  -- Operação / controles
  IF OLD.periodicidade_troca IS DISTINCT FROM NEW.periodicidade_troca THEN
    v_campos := array_append(v_campos, 'periodicidade_troca');
    v_alteracoes := v_alteracoes || jsonb_build_object('periodicidade_troca', jsonb_build_object('antes', to_jsonb(OLD.periodicidade_troca), 'depois', to_jsonb(NEW.periodicidade_troca)));
  END IF;
  IF OLD.controle_estoque IS DISTINCT FROM NEW.controle_estoque THEN
    v_campos := array_append(v_campos, 'controle_estoque');
    v_alteracoes := v_alteracoes || jsonb_build_object('controle_estoque', jsonb_build_object('antes', to_jsonb(OLD.controle_estoque), 'depois', to_jsonb(NEW.controle_estoque)));
  END IF;
  IF OLD.dias_iminencia_troca IS DISTINCT FROM NEW.dias_iminencia_troca THEN
    v_campos := array_append(v_campos, 'dias_iminencia_troca');
    v_alteracoes := v_alteracoes || jsonb_build_object('dias_iminencia_troca', jsonb_build_object('antes', to_jsonb(OLD.dias_iminencia_troca), 'depois', to_jsonb(NEW.dias_iminencia_troca)));
  END IF;
  IF OLD.obrigar_guia_tamanhos_colaborador IS DISTINCT FROM NEW.obrigar_guia_tamanhos_colaborador THEN
    v_campos := array_append(v_campos, 'obrigar_guia_tamanhos_colaborador');
    v_alteracoes := v_alteracoes || jsonb_build_object('obrigar_guia_tamanhos_colaborador', jsonb_build_object('antes', to_jsonb(OLD.obrigar_guia_tamanhos_colaborador), 'depois', to_jsonb(NEW.obrigar_guia_tamanhos_colaborador)));
  END IF;

  -- Alertas
  IF OLD.notificar_vencimentos_email IS DISTINCT FROM NEW.notificar_vencimentos_email THEN
    v_campos := array_append(v_campos, 'notificar_vencimentos_email');
    v_alteracoes := v_alteracoes || jsonb_build_object('notificar_vencimentos_email', jsonb_build_object('antes', to_jsonb(OLD.notificar_vencimentos_email), 'depois', to_jsonb(NEW.notificar_vencimentos_email)));
  END IF;
  IF OLD.notificar_vencimentos_whatsapp IS DISTINCT FROM NEW.notificar_vencimentos_whatsapp THEN
    v_campos := array_append(v_campos, 'notificar_vencimentos_whatsapp');
    v_alteracoes := v_alteracoes || jsonb_build_object('notificar_vencimentos_whatsapp', jsonb_build_object('antes', to_jsonb(OLD.notificar_vencimentos_whatsapp), 'depois', to_jsonb(NEW.notificar_vencimentos_whatsapp)));
  END IF;
  IF OLD.telefone_whatsapp_notificacao IS DISTINCT FROM NEW.telefone_whatsapp_notificacao THEN
    v_campos := array_append(v_campos, 'telefone_whatsapp_notificacao');
    v_alteracoes := v_alteracoes || jsonb_build_object('telefone_whatsapp_notificacao', jsonb_build_object('antes', to_jsonb(OLD.telefone_whatsapp_notificacao), 'depois', to_jsonb(NEW.telefone_whatsapp_notificacao)));
  END IF;
  IF OLD.telefone_whatsapp_verificado_em IS DISTINCT FROM NEW.telefone_whatsapp_verificado_em THEN
    v_campos := array_append(v_campos, 'telefone_whatsapp_verificado_em');
    v_alteracoes := v_alteracoes || jsonb_build_object('telefone_whatsapp_verificado_em', jsonb_build_object('antes', to_jsonb(OLD.telefone_whatsapp_verificado_em), 'depois', to_jsonb(NEW.telefone_whatsapp_verificado_em)));
  END IF;

  -- Assinatura digital
  IF OLD.assinatura_digital_modo IS DISTINCT FROM NEW.assinatura_digital_modo THEN
    v_campos := array_append(v_campos, 'assinatura_digital_modo');
    v_alteracoes := v_alteracoes || jsonb_build_object('assinatura_digital_modo', jsonb_build_object('antes', to_jsonb(OLD.assinatura_digital_modo), 'depois', to_jsonb(NEW.assinatura_digital_modo)));
  END IF;
  IF OLD.validacao_digital IS DISTINCT FROM NEW.validacao_digital THEN
    v_campos := array_append(v_campos, 'validacao_digital');
    v_alteracoes := v_alteracoes || jsonb_build_object('validacao_digital', jsonb_build_object('antes', to_jsonb(OLD.validacao_digital), 'depois', to_jsonb(NEW.validacao_digital)));
  END IF;
  IF OLD.obrigar_cracha_colaborador IS DISTINCT FROM NEW.obrigar_cracha_colaborador THEN
    v_campos := array_append(v_campos, 'obrigar_cracha_colaborador');
    v_alteracoes := v_alteracoes || jsonb_build_object('obrigar_cracha_colaborador', jsonb_build_object('antes', to_jsonb(OLD.obrigar_cracha_colaborador), 'depois', to_jsonb(NEW.obrigar_cracha_colaborador)));
  END IF;
  IF OLD.obrigar_cartao_colaborador IS DISTINCT FROM NEW.obrigar_cartao_colaborador THEN
    v_campos := array_append(v_campos, 'obrigar_cartao_colaborador');
    v_alteracoes := v_alteracoes || jsonb_build_object('obrigar_cartao_colaborador', jsonb_build_object('antes', to_jsonb(OLD.obrigar_cartao_colaborador), 'depois', to_jsonb(NEW.obrigar_cartao_colaborador)));
  END IF;

  -- Status (ex.: exclusão lógica)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_campos := array_append(v_campos, 'status');
    v_alteracoes := v_alteracoes || jsonb_build_object('status', jsonb_build_object('antes', to_jsonb(OLD.status), 'depois', to_jsonb(NEW.status)));
  END IF;

  IF coalesce(array_length(v_campos, 1), 0) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.historico_alteracao_projetos (
    projeto_id,
    alterado_por,
    campos_alterados,
    alteracoes
  ) VALUES (
    NEW.id,
    auth.uid(),
    v_campos,
    v_alteracoes
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historico_alteracao_projetos ON public.projetos;
CREATE TRIGGER trg_historico_alteracao_projetos
  AFTER UPDATE ON public.projetos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_alteracao_projeto();

ALTER TABLE public.historico_alteracao_projetos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hist_alt_projetos_select_gestor" ON public.historico_alteracao_projetos;
CREATE POLICY "hist_alt_projetos_select_gestor"
  ON public.historico_alteracao_projetos
  FOR SELECT
  TO authenticated
  USING (public.checar_gestor_projeto(projeto_id));

-- Inserts só via trigger (SECURITY DEFINER); sem policy de INSERT para authenticated.

REVOKE ALL ON TABLE public.historico_alteracao_projetos FROM anon;
GRANT SELECT ON TABLE public.historico_alteracao_projetos TO authenticated;
GRANT ALL ON TABLE public.historico_alteracao_projetos TO service_role;

GRANT EXECUTE ON FUNCTION public.fn_log_alteracao_projeto() TO authenticated, service_role;
