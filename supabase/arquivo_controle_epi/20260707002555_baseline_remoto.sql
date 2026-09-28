


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."checar_acesso_projeto"("p_projeto_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membro_projetos
    WHERE projeto_id = p_projeto_id
      AND usuario_id = auth.uid()
      AND status = true
  );
$$;


ALTER FUNCTION "public"."checar_acesso_projeto"("p_projeto_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checar_gestor_projeto"("p_projeto_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membro_projetos
    WHERE projeto_id = p_projeto_id
      AND usuario_id = auth.uid()
      AND funcao = 'GESTOR'
      AND status = true
  );
$$;


ALTER FUNCTION "public"."checar_gestor_projeto"("p_projeto_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_membro_is_gestor"("p_usuario_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.membro_projetos 
    WHERE usuario_id = p_usuario_id 
      AND funcao = 'GESTOR'
  );
END;
$$;


ALTER FUNCTION "public"."check_membro_is_gestor"("p_usuario_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_membro_mesma_assinatura"("p_assinatura_id" "uuid", "p_usuario_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.membro_projetos 
    WHERE assinatura_id = p_assinatura_id 
      AND usuario_id = p_usuario_id
  );
END;
$$;


ALTER FUNCTION "public"."check_membro_mesma_assinatura"("p_assinatura_id" "uuid", "p_usuario_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_project_access"("p_projeto_id" "uuid", "p_usuario_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.membro_projetos 
    WHERE projeto_id = p_projeto_id 
      AND usuario_id = p_usuario_id 
      AND status = true
  );
END;
$$;


ALTER FUNCTION "public"."check_user_project_access"("p_projeto_id" "uuid", "p_usuario_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."criar_projeto_avulso"("p_nome" "text", "p_assinatura_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_projeto_id uuid;
  v_resultado jsonb;
BEGIN
  -- 1. Captura o ID do usuário diretamente do token JWT seguro
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  -- 2. Validação de Segurança: O usuário pertence a esta assinatura?
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = v_user_id AND assinatura_id = p_assinatura_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Seu usuário não está vinculado a esta assinatura.';
  END IF;

  -- 3. Insere o Projeto respeitando a estrutura da sua tabela
  INSERT INTO public.projetos (
    nome, 
    assinatura_id, 
    status, 
    periodicidade_troca, 
    controle_estoque
  )
  VALUES (
    p_nome, 
    p_assinatura_id, 
    true, 
    true, 
    true
  )
  RETURNING id INTO v_projeto_id;

  -- 4. Cria o vínculo de GESTOR automático na tabela membro_projetos
  INSERT INTO public.membro_projetos (
    assinatura_id, 
    usuario_id, 
    projeto_id, 
    funcao, 
    status
  )
  VALUES (
    p_assinatura_id, 
    v_user_id, 
    v_projeto_id, 
    'GESTOR', 
    true
  );

  -- 5. Recupera a linha do projeto criada e converte em JSON para o Front-end
  SELECT row_to_json(p)::jsonb INTO v_resultado
  FROM public.projetos p
  WHERE p.id = v_projeto_id;

  RETURN v_resultado;
END;
$$;


ALTER FUNCTION "public"."criar_projeto_avulso"("p_nome" "text", "p_assinatura_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_ajusta_colaborador_epis"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    ids_antigos UUID[] := '{}';
    ids_novos UUID[] := '{}';
    id_epi_aux UUID;
    v_motivo TEXT;
BEGIN
    -- 1. Histórico de Cargos
    IF (TG_OP = 'INSERT') OR (OLD.cargo_funcao_id IS DISTINCT FROM NEW.cargo_funcao_id) THEN
        
        v_motivo := CASE WHEN TG_OP = 'INSERT' THEN 'LANÇAMENTO INICIAL' ELSE 'TROCA DE FUNÇÃO' END;

        INSERT INTO public.historico_cargos (
            projeto_id, colaborador_id, cargo_funcao_id_anterior, cargo_funcao_id_novo, motivo
        ) VALUES (
            NEW.projeto_id, NEW.id, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.cargo_funcao_id END, NEW.cargo_funcao_id, v_motivo
        );

        -- 2. Busca os arrays de IDs
        IF TG_OP = 'UPDATE' AND OLD.cargo_funcao_id IS NOT NULL THEN
            SELECT COALESCE(epi_catalogo_ids, '{}'::uuid[]) INTO ids_antigos 
            FROM public.cargo_funcoes WHERE id = OLD.cargo_funcao_id;
        END IF;

        SELECT COALESCE(epi_catalogo_ids, '{}'::uuid[]) INTO ids_novos 
        FROM public.cargo_funcoes WHERE id = NEW.cargo_funcao_id;

        -- 3. INATIVAÇÃO (Status '0') - Inativa apenas o que saiu da nova função
        IF TG_OP = 'UPDATE' THEN
            UPDATE public.controle_epi 
            SET status = '0'
            WHERE colaborador_id = NEW.id 
              AND status = '1'
              AND epi_catalogo_id = ANY(
                  ARRAY(
                    SELECT unnest(ids_antigos) 
                    EXCEPT 
                    SELECT unnest(ids_novos)
                  )
              );
        END IF;

        -- 4. ADIÇÃO / REATIVAÇÃO
        IF ids_novos <> '{}'::uuid[] THEN
            FOREACH id_epi_aux IN ARRAY ids_novos
            LOOP
                -- Insere. Se houver conflito, faz o update APENAS se o status for '0'
                INSERT INTO public.controle_epi (
                    projeto_id, colaborador_id, epi_catalogo_id, motivo_acao, status, observacao
                ) VALUES (
                    NEW.projeto_id, NEW.id, id_epi_aux, v_motivo, '1', 
                    CASE WHEN TG_OP = 'UPDATE' THEN 'Atualizado por troca de função' ELSE NULL END
                )
                ON CONFLICT (colaborador_id, epi_catalogo_id) 
                DO UPDATE SET 
                    status = '1', 
                    motivo_acao = EXCLUDED.motivo_acao,
                    observacao = EXCLUDED.observacao
                WHERE public.controle_epi.status = '0'; 
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_ajusta_colaborador_epis"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_debitar_estoque_epi"("p_epi_id" "uuid", "p_qtd" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Realiza o débito independentemente do saldo resultante
    UPDATE public.epis
    SET estoque_atual = estoque_atual - p_qtd
    WHERE id = p_epi_id;

    -- A validação que bloqueava o estoque negativo foi removida.
    -- O banco agora permite que o campo estoque_atual assuma valores menores que zero.
END;
$$;


ALTER FUNCTION "public"."fn_debitar_estoque_epi"("p_epi_id" "uuid", "p_qtd" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_estornar_estoque_epi"("p_epi_id" "uuid", "p_qtd" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.epis
    SET estoque_atual = estoque_atual + p_qtd
    WHERE id = p_epi_id;
END;
$$;


ALTER FUNCTION "public"."fn_estornar_estoque_epi"("p_epi_id" "uuid", "p_qtd" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_gerenciar_mudanca_cargo_colaboradores?"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
    ids_antigos UUID[] := '{}';
    ids_novos UUID[] := '{}';
    id_aux UUID;
    v_motivo TEXT;
BEGIN
    -- 1. Identifica se houve INSERT ou mudança de cargo
    IF (TG_OP = 'INSERT') OR (OLD.cargo_funcao_id IS DISTINCT FROM NEW.cargo_funcao_id) THEN
        
        v_motivo := CASE WHEN TG_OP = 'INSERT' THEN 'LANÇAMENTO INICIAL' ELSE 'TROCA DE FUNÇÃO' END;

        -- Registro obrigatório no histórico de cargos
        INSERT INTO public.historico_cargos (
            projeto_id, 
            colaborador_id, 
            cargo_funcao_id_anterior, 
            cargo_funcao_id_novo, 
            motivo
        ) VALUES (
            NEW.projeto_id, 
            NEW.id, 
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.cargo_funcao_id END, 
            NEW.cargo_funcao_id, 
            v_motivo
        );

        -- 2. Carrega as listas de EPIs (Garante que sejam arrays de UUID)
        IF TG_OP = 'UPDATE' AND OLD.cargo_funcao_id IS NOT NULL THEN
            SELECT COALESCE(epi_catalogo_ids, '{}'::uuid[]) INTO ids_antigos 
            FROM public.cargo_funcoes WHERE id = OLD.cargo_funcao_id;
        END IF;

        SELECT COALESCE(epi_catalogo_ids, '{}'::uuid[]) INTO ids_novos 
        FROM public.cargo_funcoes WHERE id = NEW.cargo_funcao_id;

        -- 3. LOGICA DE INATIVAÇÃO (O que está na antiga e NÃO está na nova)
        -- Ex: Carpinteiro(Luva) -> Pedreiro(Sem Luva). Inativa a Luva.
        IF TG_OP = 'UPDATE' THEN
            FOR id_aux IN 
                SELECT unnest(ids_antigos) EXCEPT SELECT unnest(ids_novos)
            LOOP
                UPDATE public.controle_epi 
                SET status = '0'
                WHERE colaborador_id = NEW.id 
                  AND epi_catalogo_id = id_aux
                  AND status = '1';
            END LOOP;
        END IF;

        -- 4. LOGICA DE ADIÇÃO (O que está na nova e ainda não existe como ativo)
        -- Ex: Pedreiro(Óculos). Se não tiver óculos ativo, adiciona.
        FOR id_aux IN 
            SELECT unnest(ids_novos)
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.controle_epi 
                WHERE colaborador_id = NEW.id 
                  AND epi_catalogo_id = id_aux 
                  AND status = '1'
            ) THEN
                INSERT INTO public.controle_epi (
                    projeto_id, 
                    colaborador_id, 
                    epi_catalogo_id, 
                    motivo_acao,
                    status,
                    observacao
                ) VALUES (
                    NEW.projeto_id, 
                    NEW.id, 
                    id_aux, 
                    v_motivo,
                    '1',
                    CASE WHEN TG_OP = 'UPDATE' THEN 'Mudança de função: Adicionado automaticamente' ELSE 'Carga Inicial' END
                );
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."fn_gerenciar_mudanca_cargo_colaboradores?"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_gerenciar_mudanca_no_cargo_funcao"("p_modo" "text", "p_id" "uuid", "p_projeto_id" "uuid", "p_nomenclatura" "text" DEFAULT NULL::"text", "p_setor_id" "uuid" DEFAULT NULL::"uuid", "p_epi_catalogo_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS json
    LANGUAGE "plpgsql"
    AS $$DECLARE
    v_old_epis UUID[];
    v_colab RECORD;
    v_epi_id UUID;
    v_count_colaboradores INTEGER;
    v_afetados JSON;
BEGIN
    -- 1. Validação de Exclusão da Função
    IF p_modo = 'EXCLUIR' THEN
        SELECT count(*) INTO v_count_colaboradores FROM public.colaboradores 
        WHERE cargo_funcao_id = p_id AND status = true;
        
        IF v_count_colaboradores > 0 THEN
            RETURN json_build_object('success', false, 'error', 'Bloqueado: Existem colaboradores ativos nesta função.');
        END IF;
        
        UPDATE public.cargo_funcoes SET status = false WHERE id = p_id;
        RETURN json_build_object('success', true);
    END IF;

    -- 2. Busca estado anterior para comparação de EPIs
    IF p_id IS NOT NULL THEN
        SELECT epi_catalogo_ids INTO v_old_epis FROM public.cargo_funcoes WHERE id = p_id;
    ELSE
        v_old_epis := '{}'::uuid[];
    END IF;

    -- 3. Update ou Insert do Cargo/Função
    IF p_id IS NOT NULL THEN
        UPDATE public.cargo_funcoes SET 
            nomenclatura = p_nomenclatura, 
            setor_id = p_setor_id, 
            epi_catalogo_ids = p_epi_catalogo_ids, 
            updated_at = NOW() 
        WHERE id = p_id;
    ELSE
        INSERT INTO public.cargo_funcoes (projeto_id, nomenclatura, setor_id, epi_catalogo_ids)
        VALUES (p_projeto_id, p_nomenclatura, p_setor_id, p_epi_catalogo_ids) 
        RETURNING id INTO p_id;
    END IF;

    -- 4. Lógica de Propagação para Tabela controle_epi
    -- Só executa se houve alteração na lista de EPIs
    IF v_old_epis IS DISTINCT FROM p_epi_catalogo_ids THEN
        
        -- Registra no histórico de alteração da função
        INSERT INTO public.historico_alteracao_em_cargo_funcoes (cargo_funcao_id, epi_catalogo_epis)
        VALUES (p_id, p_epi_catalogo_ids);

        -- Itera sobre os colaboradores ativos que exercem esta função
        FOR v_colab IN (SELECT id FROM public.colaboradores WHERE cargo_funcao_id = p_id AND status = true) LOOP
            
            -- ADIÇÃO: Para cada EPI novo na lista, cria o registro de necessidade no controle
            FOREACH v_epi_id IN ARRAY p_epi_catalogo_ids LOOP
                IF NOT (v_epi_id = ANY(v_old_epis)) THEN
                    INSERT INTO public.controle_epi (
                        projeto_id, 
                        colaborador_id, 
                        epi_catalogo_id, 
                        motivo_acao
                    )
                    VALUES (
                        p_projeto_id, 
                        v_colab.id, 
                        v_epi_id, 
                        'ADIÇÃO PARA FUNÇÃO'
                    );
                END IF;
            END LOOP;

            -- REMOÇÃO: Apaga registros do EPI que saiu da lista obrigatória
            -- Como existe histórico em outra tabela, limpamos totalmente o controle atual
            FOREACH v_epi_id IN ARRAY v_old_epis LOOP
                IF NOT (v_epi_id = ANY(p_epi_catalogo_ids)) THEN
                    DELETE FROM public.controle_epi 
                    WHERE colaborador_id = v_colab.id 
                      AND epi_catalogo_id = v_epi_id;
                END IF;
            END LOOP;
            
        END LOOP;
    END IF;

    -- 5. Retorno com lista de afetados para o Frontend
    SELECT json_agg(json_build_object('id', id, 'nome', nome)) INTO v_afetados
    FROM public.colaboradores WHERE cargo_funcao_id = p_id AND status = true;

    RETURN json_build_object(
        'success', true, 
        'id', p_id, 
        'afetados', COALESCE(v_afetados, '[]'::json)
    );
END;$$;


ALTER FUNCTION "public"."fn_gerenciar_mudanca_no_cargo_funcao"("p_modo" "text", "p_id" "uuid", "p_projeto_id" "uuid", "p_nomenclatura" "text", "p_setor_id" "uuid", "p_epi_catalogo_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_pode_desativar_epi"("p_epi_id" "uuid", "p_epi_catalogo_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total_mesmo_tipo INTEGER;
    v_em_uso_cargo BOOLEAN;
BEGIN
    -- Conta quantos epis ativos existem do mesmo tipo
    SELECT count(*) INTO v_total_mesmo_tipo FROM public.epis 
    WHERE epi_catalogo_id = p_epi_catalogo_id AND status = true;

    -- Verifica se o ID está em algum array de cargo_funcoes
    SELECT EXISTS (
        SELECT 1 FROM public.cargo_funcoes 
        WHERE p_epi_catalogo_id = ANY(epi_catalogo_ids) AND status = true
    ) INTO v_em_uso_cargo;

    -- Regra: Se for o último do tipo, não pode estar em cargo_funcoes
    IF v_total_mesmo_tipo <= 1 AND v_em_uso_cargo THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."fn_pode_desativar_epi"("p_epi_id" "uuid", "p_epi_catalogo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_validar_e_inativar_epi"("p_epi_id" "uuid", "p_catalogo_id" "uuid") RETURNS TABLE("sucesso" boolean, "mensagem" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_existe_outro BOOLEAN;
    v_vinculado_cargo BOOLEAN;
BEGIN
    -- 1. Verifica se existe outro cadastro ATIVO do mesmo tipo (epi_catalogo_id)
    SELECT EXISTS (
        SELECT 1 FROM epis 
        WHERE epi_catalogo_id = p_catalogo_id 
        AND id != p_epi_id 
        AND status = true
    ) INTO v_existe_outro;

    -- 2. Se não houver outro, verifica se este tipo está em algum cargo (array epi_catalogo_ids)
    IF NOT v_existe_outro THEN
        SELECT EXISTS (
            SELECT 1 FROM cargo_funcoes 
            WHERE p_catalogo_id = ANY(epi_catalogo_ids)
            AND status = true
        ) INTO v_vinculado_cargo;
    ELSE
        v_vinculado_cargo := false;
    END IF;

    -- 3. Lógica de decisão
    IF v_existe_outro OR NOT v_vinculado_cargo THEN
        -- Pode inativar
        UPDATE epis SET status = false WHERE id = p_epi_id;
        RETURN QUERY SELECT true, 'Equipamento inativado com sucesso.'::TEXT;
    ELSE
        -- Bloqueia e informa o motivo
        RETURN QUERY SELECT false, 'Não é possível excluir: Este é o único EPI deste tipo e ele está sendo exigido em cargos/funções.'::TEXT;
    END IF;
END;
$$;


ALTER FUNCTION "public"."fn_validar_e_inativar_epi"("p_epi_id" "uuid", "p_catalogo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_validar_membro_projeto_podem_ver_os_demais"("p_projeto_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Realizamos a contagem diretamente para evitar que o PG tente "otimizar" a subconsulta com RLS
  SELECT COUNT(*) INTO v_count
  FROM public.membro_projetos
  WHERE projeto_id = p_projeto_id 
    AND usuario_id = p_user_id;

  RETURN v_count > 0;
END;
$$;


ALTER FUNCTION "public"."fn_validar_membro_projeto_podem_ver_os_demais"("p_projeto_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_assinatura_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT assinatura_id FROM public.usuarios WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_assinatura_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insere apenas se for um convite com metadados (garante que não processe usuários de teste manuais sem dados)
  IF NEW.raw_user_meta_data->>'assinatura_id' IS NOT NULL THEN
    
    -- Insere na sua tabela pública de usuários
    INSERT INTO public.usuarios (id, nome_completo, email)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'nome_completo', NEW.email);

    -- Insere o vínculo na tabela membro_projetos em lote
    INSERT INTO public.membro_projetos (usuario_id, projeto_id, assinatura_id, funcao, status)
    SELECT 
      NEW.id, 
      (jsonb_array_elements_text(NEW.raw_user_meta_data->'projeto_ids'))::uuid, 
      (NEW.raw_user_meta_data->>'assinatura_id')::uuid,
      (NEW.raw_user_meta_data->>'role')::text,
      true;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_comunicado_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IN (
      'contato@proativaweb.com.br'
    ),
    false
  );
$$;


ALTER FUNCTION "public"."is_comunicado_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_mudanca_status_assinatura"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO log_assinaturas_auditoria (
    assinatura_id, status_antigo, status_novo, alterado_por
  ) VALUES (
    NEW.id,
    OLD.plano_status,
    NEW.plano_status,
    COALESCE(current_setting('app.alterado_por', true), 'sistema')  -- fallback
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_mudanca_status_assinatura"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."novo_registro_usuario_colaborador_depois_da_edge"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    v_assinatura_id uuid;
    v_nome_completo text;
    v_role text;
BEGIN
    -- 1. Trava de segurança: só processa se a origem for CONVIDADO
    IF COALESCE(NEW.raw_user_meta_data->>'origem_cadastro', '') <> 'CONVIDADO' THEN
        RETURN NEW;
    END IF;

    -- 2. PROTEÇÃO GOOGLE: Evita duplicidade se disparado por UPDATE
    IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    v_assinatura_id := (NEW.raw_user_meta_data->>'assinatura_id')::uuid;
    v_nome_completo := COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Usuário');
    v_role          := COALESCE(NEW.raw_user_meta_data->>'role', 'COLABORADOR');

    IF v_assinatura_id IS NOT NULL THEN
        
        -- Passo A: Cria o perfil básico na tabela 'usuarios'
        INSERT INTO public.usuarios (id, assinatura_id, email, nome_completo, status, status_cadastro)
        VALUES (NEW.id, v_assinatura_id, NEW.email, v_nome_completo, true, 'PENDENTE');

        -- Passo B: Vincula múltiplos registros em 'membro_projetos'
        IF NEW.raw_user_meta_data->'projeto_ids' IS NOT NULL THEN
            INSERT INTO public.membro_projetos (assinatura_id, usuario_id, projeto_id, funcao, status)
            SELECT 
                v_assinatura_id, 
                NEW.id, 
                p_id::uuid, 
                v_role, 
                true
            FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'projeto_ids') AS p_id
            ON CONFLICT (usuario_id, projeto_id) DO NOTHING;
        END IF;

    END IF;

    RETURN NEW;
END;$$;


ALTER FUNCTION "public"."novo_registro_usuario_colaborador_depois_da_edge"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."novo_registro_usuario_gestor"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_assinatura_id uuid;
    v_nome_completo text;
    v_cnpj text;
    v_projeto_id uuid;
    v_assinatura_tipo text;
BEGIN
    -- 1. Trava de segurança: só processa se a origem for o DONO
    IF COALESCE(NEW.raw_user_meta_data->>'origem_cadastro', '') <> 'DONO' THEN
        RETURN NEW;
    END IF;

    -- 2. Proteção: Se o usuário já tiver perfil, ignora
    IF EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    -- Extrai dados do meta_data enviado pelo Front
    v_assinatura_id := (NEW.raw_user_meta_data->>'assinatura_id')::uuid;
    v_nome_completo := COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Meu Projeto');
    v_cnpj          := NEW.raw_user_meta_data->>'cnpj';
    v_assinatura_tipo := COALESCE(NEW.raw_user_meta_data->>'assinatura_tipo', 'AUTONOMO');

    -- 3. Lógica de Criação: Se não veio assinatura, criamos uma nova (Plano Gratuito/Iniciante)
    IF v_assinatura_id IS NULL THEN
        INSERT INTO public.assinaturas (plano_status, assinatura_tipo, plano_tipo, proprietario_id)
        VALUES ('active', v_assinatura_tipo, 'INICIANTE', NEW.id)
        RETURNING id INTO v_assinatura_id;
    ELSE
        -- Se veio, apenas vincula o dono se estiver órfã
        UPDATE public.assinaturas
        SET proprietario_id = NEW.id
        WHERE id = v_assinatura_id AND proprietario_id IS NULL;
    END IF;

    -- 4. Cria o perfil na tabela 'usuarios'
    INSERT INTO public.usuarios (id, assinatura_id, email, nome_completo, status)
    VALUES (NEW.id, v_assinatura_id, NEW.email, v_nome_completo, true);

    -- 5. Cria o projeto padrão
    INSERT INTO public.projetos (assinatura_id, nome, cnpj, status)
    VALUES (v_assinatura_id, v_nome_completo, v_cnpj, true)
    RETURNING id INTO v_projeto_id;

    -- 6. Vincula o Gestor ao Projeto
    INSERT INTO public.membro_projetos (assinatura_id, usuario_id, projeto_id, funcao, status)
    VALUES (v_assinatura_id, NEW.id, v_projeto_id, 'GESTOR', true);

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."novo_registro_usuario_gestor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."processar_entrada_estoque"("p_projeto_id" "uuid", "p_fornecedor_id" "uuid", "p_nota_fiscal" "text", "p_data_entrada" "date", "p_itens" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN SELECT * FROM jsonb_to_recordset(p_itens) 
        AS x(epi_id UUID, quantidade INT, valor_unitario NUMERIC)
    LOOP
        -- Inserção no histórico (conforme seu schema)
        INSERT INTO public.registro_entradas (
            projeto_id, 
            fornecedor_id, 
            nota_fiscal, 
            data_entrada, 
            epi_id, 
            quantidade, 
            valor_unitario
        )
        VALUES (
            p_projeto_id, 
            p_fornecedor_id, 
            p_nota_fiscal, 
            p_data_entrada, 
            item.epi_id, 
            item.quantidade, 
            item.valor_unitario
        );

        -- Atualização do saldo e preço atual no cadastro do EPI
        UPDATE public.epis 
        SET 
            estoque_atual = COALESCE(estoque_atual, 0) + item.quantidade,
            valor_unitario_atual = item.valor_unitario
        WHERE id = item.epi_id;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."processar_entrada_estoque"("p_projeto_id" "uuid", "p_fornecedor_id" "uuid", "p_nota_fiscal" "text", "p_data_entrada" "date", "p_itens" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assinaturas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "proprietario_id" "uuid",
    "assinatura_tipo" "text",
    "plano_tipo" "text",
    "plano_status" "text",
    "plano_regra_id" "text",
    "dias_tolerancia" integer DEFAULT 15,
    "cancel_at_period_end" boolean DEFAULT false,
    "data_inicio" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "proxima_fatura" timestamp with time zone,
    "plano_fim_periodo" timestamp with time zone,
    "data_falha_pagamento" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stripe_latest_invoice_url" "text",
    "cancel_at" timestamp with time zone,
    "motivo_falha" "text",
    CONSTRAINT "assinaturas_assinatura_tipo_check" CHECK (("assinatura_tipo" = ANY (ARRAY['AUTONOMO'::"text", 'EMPRESARIAL'::"text"]))),
    CONSTRAINT "assinaturas_plano_tipo_check" CHECK (("plano_tipo" = ANY (ARRAY['INICIANTE'::"text", 'PRO'::"text", 'GESTOR'::"text", 'DESENVOLVIMENTO'::"text", 'TESTE-DIARIO'::"text"]))),
    CONSTRAINT "check_plano_status" CHECK (("plano_status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'unpaid'::"text", 'canceled'::"text", 'incomplete'::"text", 'trialing'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."assinaturas" OWNER TO "postgres";


COMMENT ON COLUMN "public"."assinaturas"."stripe_latest_invoice_url" IS 'Link fornecido pelo Stripe para o cliente realizar o pagamento de uma fatura pendente ou falha.';



COMMENT ON COLUMN "public"."assinaturas"."cancel_at" IS 'Data em que a assinatura será efetivamente encerrada caso o usuário tenha solicitado o cancelamento ao final do período vigente.';



CREATE TABLE IF NOT EXISTS "public"."cargo_funcoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "projeto_id" "uuid",
    "nomenclatura" "text" NOT NULL,
    "epi_catalogo_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "setor_id" "uuid",
    "status" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."cargo_funcoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalogo_tamanhos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guia_tamanho" integer NOT NULL,
    "descricao" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."catalogo_tamanhos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."colaboradores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "projeto_id" "uuid",
    "nome" "text" NOT NULL,
    "data_admissao" "date" NOT NULL,
    "cargo_funcao_id" "uuid",
    "inscricao" "text",
    "tamanho_calcado_id" "uuid",
    "tamanho_luva_id" "uuid",
    "tamanho_respirador_id" "uuid",
    "tamanho_vestimenta_inf_id" "uuid",
    "tamanho_vestimenta_sup_id" "uuid",
    "validade_treinamento_altura" "date",
    "status" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."colaboradores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comunicados_dismiss" (
    "usuario_id" "uuid" NOT NULL,
    "comunicado_id" "uuid" NOT NULL,
    "dismissed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comunicados_dismiss" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comunicados_sistema" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "tipo" "text" DEFAULT 'info'::"text",
    "ativo" boolean DEFAULT true,
    "prioridade" integer DEFAULT 0,
    "inicia_em" timestamp with time zone DEFAULT "now"(),
    "expira_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comunicados_sistema" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."controle_epi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "projeto_id" "uuid",
    "colaborador_id" "uuid",
    "epi_catalogo_id" "uuid" NOT NULL,
    "epi_id" "uuid",
    "ca_numero" "text",
    "data_fornecimento" "date",
    "quantidade" integer DEFAULT 1,
    "motivo_acao" "text",
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" boolean DEFAULT true,
    CONSTRAINT "controle_epi_motivo_acao_check" CHECK (("motivo_acao" = ANY (ARRAY['LANÇAMENTO INICIAL'::"text", 'TROCA PERIODICA'::"text", 'TROCA PREMATURA'::"text", 'PERCA OU EXTRAVIO'::"text", 'ADIÇÃO PARA FUNÇÃO'::"text", 'TROCA DE FUNÇÃO'::"text", 'EMERGENCIAL'::"text"])))
);


ALTER TABLE "public"."controle_epi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."epi_catalogo" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "descricao" "text" NOT NULL,
    "classificacao" "text",
    "guia_tamanho_catalogo" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "obrigatorio_ca" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."epi_catalogo" OWNER TO "postgres";


COMMENT ON TABLE "public"."epi_catalogo" IS 'Lista mestre de equipamentos que serve de base para o cadastro nos projetos.';



CREATE TABLE IF NOT EXISTS "public"."epis" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "projeto_id" "uuid" NOT NULL,
    "epi_catalogo_id" "uuid" NOT NULL,
    "catalogo_tamanho_id" "uuid" NOT NULL,
    "prazo_troca_dias" integer DEFAULT 90,
    "estoque_minimo" integer DEFAULT 0,
    "estoque_ideal" integer DEFAULT 0,
    "estoque_atual" integer DEFAULT 0,
    "valor_unitario_atual" numeric(10,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "status" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."epis" OWNER TO "postgres";


COMMENT ON COLUMN "public"."epis"."status" IS '1 para Ativo, 0 para Inativo/Excluído';



CREATE TABLE IF NOT EXISTS "public"."fornecedores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "projeto_id" "uuid",
    "razao_social" "text" NOT NULL,
    "nome_contato" "text",
    "email_contato" "text",
    "telefone_contato" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."fornecedores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historico_alteracao_em_cargo_funcoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cargo_funcao_id" "uuid" NOT NULL,
    "epi_catalogo_epis" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "data_alteracao" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."historico_alteracao_em_cargo_funcoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historico_cargos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "projeto_id" "uuid" NOT NULL,
    "colaborador_id" "uuid" NOT NULL,
    "cargo_funcao_id_anterior" "uuid",
    "cargo_funcao_id_novo" "uuid" NOT NULL,
    "data_alteracao" timestamp with time zone DEFAULT "now"(),
    "motivo" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."historico_cargos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historico_controle_epi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "projeto_id" "uuid",
    "colaborador_id" "uuid",
    "epi_id" "uuid",
    "ca_numero" "text",
    "data_fornecimento" "date",
    "motivo_acao" "text",
    "quantidade" integer,
    "observacao" "text",
    "epi_catalogo_id" "uuid"
);


ALTER TABLE "public"."historico_controle_epi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."log_assinaturas_auditoria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assinatura_id" "uuid",
    "status_antigo" "text",
    "status_novo" "text",
    "alterado_por" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."log_assinaturas_auditoria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."log_webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "text",
    "event_type" "text",
    "payload" "jsonb",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "erro_mensagem" "text"
);


ALTER TABLE "public"."log_webhooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membro_projetos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assinatura_id" "uuid" NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "projeto_id" "uuid" NOT NULL,
    "funcao" "text" NOT NULL,
    "status" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "membro_projetos_funcao_check" CHECK (("funcao" = ANY (ARRAY['GESTOR'::"text", 'COLABORADOR'::"text"])))
);


ALTER TABLE "public"."membro_projetos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plano_regras" (
    "stripe_price_id" "text" NOT NULL,
    "nome_plano" "text",
    "quantidade_projetos" integer DEFAULT 0,
    "quantidade_colaboradores" integer DEFAULT 0,
    "quantidade_epis" integer DEFAULT 0
);


ALTER TABLE "public"."plano_regras" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projetos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assinatura_id" "uuid" NOT NULL,
    "nome" character varying(100),
    "cnpj" character varying(20),
    "razao_social" "text",
    "inscricao_estadual" "text",
    "inscricao_municipal" "text",
    "cnae" "text",
    "regime_tributario" "text",
    "logradouro" "text",
    "numero" "text",
    "complemento" "text",
    "bairro" "text",
    "cidade" "text",
    "estado" character varying(2),
    "cep" "text",
    "logo_url" "text",
    "status" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "periodicidade_troca" boolean DEFAULT true,
    "controle_estoque" boolean DEFAULT true
);


ALTER TABLE "public"."projetos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registro_entradas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "projeto_id" "uuid",
    "fornecedor_id" "uuid",
    "nota_fiscal" "text",
    "data_entrada" "date" DEFAULT CURRENT_DATE,
    "epi_id" "uuid",
    "quantidade" integer NOT NULL,
    "valor_unitario" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "registro_entradas_quantidade_check" CHECK (("quantidade" > 0))
);


ALTER TABLE "public"."registro_entradas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."setores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "projeto_id" "uuid",
    "descricao" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."setores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suporte_orientacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text" NOT NULL,
    "link_materiais" "text",
    "link_video" "text"
);


ALTER TABLE "public"."suporte_orientacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" NOT NULL,
    "assinatura_id" "uuid",
    "email" character varying(255) NOT NULL,
    "nome_completo" character varying(255),
    "telefone" "text",
    "foto_url" "text",
    "status" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_concluido" boolean DEFAULT false NOT NULL,
    "status_cadastro" "text" DEFAULT 'ATIVO'::"text"
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


COMMENT ON COLUMN "public"."usuarios"."onboarding_concluido" IS 'Indica se o usuário já concluiu o fluxo de tutorial inicial (EPI -> Cargo -> Colaborador)';



CREATE OR REPLACE VIEW "public"."v_controle_epi" AS
 SELECT "ce"."id" AS "controle_id",
    "ce"."projeto_id",
    "ce"."data_fornecimento",
    "ce"."quantidade",
    "ce"."ca_numero",
    "ce"."motivo_acao",
    "ce"."observacao",
    "ce"."epi_catalogo_id",
    "c"."id" AS "colaborador_id",
    "c"."nome" AS "colaborador_nome",
    "c"."inscricao" AS "colaborador_matricula",
    "cf"."nomenclatura" AS "cargo_funcao_nome",
    "s"."descricao" AS "setor_nome",
    "ec"."descricao" AS "epi_nome",
    "ec"."classificacao" AS "epi_classificacao",
    "e"."prazo_troca_dias",
        CASE
            WHEN ("ce"."epi_id" IS NULL) THEN NULL::"date"
            ELSE (("ce"."data_fornecimento" + ((COALESCE("e"."prazo_troca_dias", 90) || ' days'::"text"))::interval))::"date"
        END AS "prazo_previsto",
        CASE
            WHEN ("ce"."epi_id" IS NULL) THEN NULL::integer
            ELSE ((("ce"."data_fornecimento" + ((COALESCE("e"."prazo_troca_dias", 90) || ' days'::"text"))::interval))::"date" - CURRENT_DATE)
        END AS "prazo_restante_dias",
        CASE
            WHEN ("ce"."epi_id" IS NULL) THEN 'PENDENTE'::"text"
            WHEN (((("ce"."data_fornecimento" + ((COALESCE("e"."prazo_troca_dias", 90) || ' days'::"text"))::interval))::"date" - CURRENT_DATE) < 0) THEN 'VENCIDO'::"text"
            WHEN ((((("ce"."data_fornecimento" + ((COALESCE("e"."prazo_troca_dias", 90) || ' days'::"text"))::interval))::"date" - CURRENT_DATE) >= 0) AND (((("ce"."data_fornecimento" + ((COALESCE("e"."prazo_troca_dias", 90) || ' days'::"text"))::interval))::"date" - CURRENT_DATE) <= 3)) THEN 'IMINENTE'::"text"
            ELSE 'NO PRAZO'::"text"
        END AS "status_prazo"
   FROM ((((("public"."controle_epi" "ce"
     JOIN "public"."colaboradores" "c" ON (("ce"."colaborador_id" = "c"."id")))
     LEFT JOIN "public"."cargo_funcoes" "cf" ON (("c"."cargo_funcao_id" = "cf"."id")))
     LEFT JOIN "public"."setores" "s" ON (("cf"."setor_id" = "s"."id")))
     JOIN "public"."epi_catalogo" "ec" ON (("ce"."epi_catalogo_id" = "ec"."id")))
     LEFT JOIN "public"."epis" "e" ON (("ce"."epi_id" = "e"."id")));


ALTER VIEW "public"."v_controle_epi" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_sugestao_compras" AS
 SELECT "e"."id" AS "epi_id",
    "e"."projeto_id",
    "ec"."descricao" AS "equipamento",
    "ct"."descricao" AS "tamanho",
    "e"."estoque_minimo",
    "e"."estoque_ideal",
    "e"."estoque_atual",
    "e"."valor_unitario_atual",
        CASE
            WHEN (("e"."estoque_ideal" - "e"."estoque_atual") > 0) THEN ("e"."estoque_ideal" - "e"."estoque_atual")
            ELSE 0
        END AS "qtd_necessaria"
   FROM (("public"."epis" "e"
     JOIN "public"."epi_catalogo" "ec" ON (("e"."epi_catalogo_id" = "ec"."id")))
     JOIN "public"."catalogo_tamanhos" "ct" ON (("e"."catalogo_tamanho_id" = "ct"."id")))
  WHERE (("e"."status" = true) AND ("e"."estoque_atual" < "e"."estoque_ideal"));


ALTER VIEW "public"."v_sugestao_compras" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_status_acesso" AS
 SELECT "id" AS "assinatura_id",
    "proprietario_id",
    "plano_status",
    "plano_fim_periodo",
        CASE
            WHEN ("plano_status" = 'active'::"text") THEN true
            WHEN (("plano_status" = 'past_due'::"text") AND ((COALESCE("data_falha_pagamento", "plano_fim_periodo") + '15 days'::interval) > "now"())) THEN true
            ELSE false
        END AS "acesso_liberado",
        CASE
            WHEN ("plano_status" = 'past_due'::"text") THEN GREATEST((0)::numeric, EXTRACT(day FROM ((COALESCE("data_falha_pagamento", "plano_fim_periodo") + '15 days'::interval) - "now"())))
            ELSE (0)::numeric
        END AS "dias_restantes_carencia"
   FROM "public"."assinaturas" "a";


ALTER VIEW "public"."view_status_acesso" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assinaturas"
    ADD CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cargo_funcoes"
    ADD CONSTRAINT "cargo_funcoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalogo_tamanhos"
    ADD CONSTRAINT "catalogo_tamanhos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comunicados_dismiss"
    ADD CONSTRAINT "comunicados_dismiss_pkey" PRIMARY KEY ("usuario_id", "comunicado_id");



ALTER TABLE ONLY "public"."comunicados_sistema"
    ADD CONSTRAINT "comunicados_sistema_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."controle_epi"
    ADD CONSTRAINT "controle_epi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."epi_catalogo"
    ADD CONSTRAINT "epi_catalogo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."epis"
    ADD CONSTRAINT "epis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fornecedores"
    ADD CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historico_alteracao_em_cargo_funcoes"
    ADD CONSTRAINT "historico_alteracao_em_cargo_funcoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historico_cargos"
    ADD CONSTRAINT "historico_cargos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historico_controle_epi"
    ADD CONSTRAINT "historico_controle_epi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."log_assinaturas_auditoria"
    ADD CONSTRAINT "log_assinaturas_auditoria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."log_webhooks"
    ADD CONSTRAINT "log_webhooks_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."log_webhooks"
    ADD CONSTRAINT "log_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membro_projetos"
    ADD CONSTRAINT "membro_projetos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plano_regras"
    ADD CONSTRAINT "plano_regras_pkey" PRIMARY KEY ("stripe_price_id");



ALTER TABLE ONLY "public"."projetos"
    ADD CONSTRAINT "projetos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registro_entradas"
    ADD CONSTRAINT "registro_entradas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."setores"
    ADD CONSTRAINT "setores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suporte_orientacoes"
    ADD CONSTRAINT "suporte_orientacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membro_projetos"
    ADD CONSTRAINT "uk_usuario_projeto" UNIQUE ("usuario_id", "projeto_id");



ALTER TABLE ONLY "public"."controle_epi"
    ADD CONSTRAINT "unique_colaborador_epi_catalogo" UNIQUE ("colaborador_id", "epi_catalogo_id");



ALTER TABLE ONLY "public"."epis"
    ADD CONSTRAINT "unique_epi_projeto_tamanho" UNIQUE ("projeto_id", "epi_catalogo_id", "catalogo_tamanho_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "idx_assinaturas_subscription_id" ON "public"."assinaturas" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_catalogo_tamanhos_guia" ON "public"."catalogo_tamanhos" USING "btree" ("guia_tamanho");



CREATE INDEX "idx_entradas_projeto" ON "public"."registro_entradas" USING "btree" ("projeto_id");



CREATE INDEX "idx_epi_catalogo_guia_tamanho" ON "public"."epi_catalogo" USING "btree" ("guia_tamanho_catalogo");



CREATE INDEX "idx_epis_catalogo" ON "public"."epis" USING "btree" ("epi_catalogo_id");



CREATE INDEX "idx_epis_projeto" ON "public"."epis" USING "btree" ("projeto_id");



CREATE INDEX "idx_epis_projeto_item_tamanho" ON "public"."epis" USING "btree" ("projeto_id", "epi_catalogo_id", "catalogo_tamanho_id");



CREATE INDEX "idx_epis_tamanho" ON "public"."epis" USING "btree" ("catalogo_tamanho_id");



CREATE INDEX "idx_fornecedores_projeto" ON "public"."fornecedores" USING "btree" ("projeto_id");



CREATE INDEX "idx_hist_cargo_funcao_id" ON "public"."historico_alteracao_em_cargo_funcoes" USING "btree" ("cargo_funcao_id");



CREATE INDEX "idx_hist_cargos_colaborador" ON "public"."historico_cargos" USING "btree" ("colaborador_id");



CREATE INDEX "idx_hist_cargos_projeto" ON "public"."historico_cargos" USING "btree" ("projeto_id");



CREATE INDEX "idx_historico_controle_epi_catalogo" ON "public"."historico_controle_epi" USING "btree" ("epi_catalogo_id");



CREATE INDEX "idx_historico_controle_epi_colaborador" ON "public"."historico_controle_epi" USING "btree" ("colaborador_id");



CREATE INDEX "idx_historico_controle_epi_projeto_data" ON "public"."historico_controle_epi" USING "btree" ("projeto_id", "data_fornecimento" DESC);



CREATE OR REPLACE TRIGGER "trg_auditoria_assinaturas" AFTER UPDATE OF "plano_status" ON "public"."assinaturas" FOR EACH ROW EXECUTE FUNCTION "public"."log_mudanca_status_assinatura"();



CREATE OR REPLACE TRIGGER "trg_depois_salvar_colaborador" AFTER INSERT OR UPDATE ON "public"."colaboradores" FOR EACH ROW EXECUTE FUNCTION "public"."fn_ajusta_colaborador_epis"();



CREATE OR REPLACE TRIGGER "trg_gerenciar_mudanca_cargo" AFTER INSERT OR UPDATE ON "public"."colaboradores" FOR EACH ROW EXECUTE FUNCTION "public"."fn_gerenciar_mudanca_cargo_colaboradores?"();



ALTER TABLE ONLY "public"."cargo_funcoes"
    ADD CONSTRAINT "cargo_funcoes_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_cargo_funcao_id_fkey" FOREIGN KEY ("cargo_funcao_id") REFERENCES "public"."cargo_funcoes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_tamanho_calcado_id_fkey" FOREIGN KEY ("tamanho_calcado_id") REFERENCES "public"."catalogo_tamanhos"("id");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_tamanho_luva_id_fkey" FOREIGN KEY ("tamanho_luva_id") REFERENCES "public"."catalogo_tamanhos"("id");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_tamanho_respirador_id_fkey" FOREIGN KEY ("tamanho_respirador_id") REFERENCES "public"."catalogo_tamanhos"("id");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_tamanho_vestimenta_inf_id_fkey" FOREIGN KEY ("tamanho_vestimenta_inf_id") REFERENCES "public"."catalogo_tamanhos"("id");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_tamanho_vestimenta_sup_id_fkey" FOREIGN KEY ("tamanho_vestimenta_sup_id") REFERENCES "public"."catalogo_tamanhos"("id");



ALTER TABLE ONLY "public"."comunicados_dismiss"
    ADD CONSTRAINT "comunicados_dismiss_comunicado_id_fkey" FOREIGN KEY ("comunicado_id") REFERENCES "public"."comunicados_sistema"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comunicados_dismiss"
    ADD CONSTRAINT "comunicados_dismiss_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."controle_epi"
    ADD CONSTRAINT "controle_epi_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."controle_epi"
    ADD CONSTRAINT "controle_epi_epi_id_fkey" FOREIGN KEY ("epi_id") REFERENCES "public"."epis"("id");



ALTER TABLE ONLY "public"."epis"
    ADD CONSTRAINT "epis_catalogo_tamanho_id_fkey" FOREIGN KEY ("catalogo_tamanho_id") REFERENCES "public"."catalogo_tamanhos"("id");



ALTER TABLE ONLY "public"."epis"
    ADD CONSTRAINT "epis_epi_catalogo_id_fkey" FOREIGN KEY ("epi_catalogo_id") REFERENCES "public"."epi_catalogo"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."historico_alteracao_em_cargo_funcoes"
    ADD CONSTRAINT "fk_historico_cargo_funcao" FOREIGN KEY ("cargo_funcao_id") REFERENCES "public"."cargo_funcoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assinaturas"
    ADD CONSTRAINT "fk_plano_regra" FOREIGN KEY ("plano_regra_id") REFERENCES "public"."plano_regras"("stripe_price_id");



ALTER TABLE ONLY "public"."historico_cargos"
    ADD CONSTRAINT "hist_cargos_anterior_fkey" FOREIGN KEY ("cargo_funcao_id_anterior") REFERENCES "public"."cargo_funcoes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."historico_cargos"
    ADD CONSTRAINT "hist_cargos_colaborador_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."historico_cargos"
    ADD CONSTRAINT "hist_cargos_novo_fkey" FOREIGN KEY ("cargo_funcao_id_novo") REFERENCES "public"."cargo_funcoes"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."historico_controle_epi"
    ADD CONSTRAINT "historico_controle_epi_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id");



ALTER TABLE ONLY "public"."historico_controle_epi"
    ADD CONSTRAINT "historico_controle_epi_epi_catalogo_id_fkey" FOREIGN KEY ("epi_catalogo_id") REFERENCES "public"."epi_catalogo"("id");



ALTER TABLE ONLY "public"."log_assinaturas_auditoria"
    ADD CONSTRAINT "log_assinaturas_auditoria_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "public"."assinaturas"("id");



ALTER TABLE ONLY "public"."membro_projetos"
    ADD CONSTRAINT "membro_projetos_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "public"."assinaturas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membro_projetos"
    ADD CONSTRAINT "membro_projetos_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."projetos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membro_projetos"
    ADD CONSTRAINT "membro_projetos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projetos"
    ADD CONSTRAINT "projetos_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "public"."assinaturas"("id");



ALTER TABLE ONLY "public"."registro_entradas"
    ADD CONSTRAINT "registro_entradas_epi_id_fkey" FOREIGN KEY ("epi_id") REFERENCES "public"."epis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registro_entradas"
    ADD CONSTRAINT "registro_entradas_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "public"."assinaturas"("id");



CREATE POLICY "Permitir criacao de assinatura no cadastro" ON "public"."assinaturas" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Permitir leitura das regras dos planos" ON "public"."plano_regras" FOR SELECT USING (true);



CREATE POLICY "Permitir leitura de orientações para usuários logados" ON "public"."suporte_orientacoes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir tudo para autenticados" ON "public"."setores" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Proprietários podem ler sua própria assinatura" ON "public"."assinaturas" FOR SELECT TO "authenticated" USING (("proprietario_id" = "auth"."uid"()));



CREATE POLICY "Usuários podem atualizar o próprio perfil" ON "public"."usuarios" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Usuários podem ler sua própria assinatura" ON "public"."assinaturas" FOR SELECT TO "authenticated" USING (("id" = ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'assinatura_id'::"text"))::"uuid"));



ALTER TABLE "public"."assinaturas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assinaturas_insert_public" ON "public"."assinaturas" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "assinaturas_member_select" ON "public"."assinaturas" FOR SELECT USING (("id" = ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'assinatura_id'::"text"))::"uuid"));



CREATE POLICY "comunicados_delete_admin" ON "public"."comunicados_sistema" FOR DELETE TO "authenticated" USING ("public"."is_comunicado_admin"());



ALTER TABLE "public"."comunicados_dismiss" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comunicados_insert_admin" ON "public"."comunicados_sistema" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_comunicado_admin"());



CREATE POLICY "comunicados_select_admin" ON "public"."comunicados_sistema" FOR SELECT TO "authenticated" USING ("public"."is_comunicado_admin"());



CREATE POLICY "comunicados_select_ativos" ON "public"."comunicados_sistema" FOR SELECT TO "authenticated" USING ((("ativo" IS TRUE) AND ("inicia_em" <= "now"()) AND (("expira_em" IS NULL) OR ("expira_em" > "now"()))));



ALTER TABLE "public"."comunicados_sistema" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comunicados_update_admin" ON "public"."comunicados_sistema" FOR UPDATE TO "authenticated" USING ("public"."is_comunicado_admin"()) WITH CHECK ("public"."is_comunicado_admin"());



CREATE POLICY "dismiss_insert_own" ON "public"."comunicados_dismiss" FOR INSERT TO "authenticated" WITH CHECK ((("usuario_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."comunicados_sistema" "c"
  WHERE (("c"."id" = "comunicados_dismiss"."comunicado_id") AND ("c"."ativo" IS TRUE) AND ("c"."inicia_em" <= "now"()) AND (("c"."expira_em" IS NULL) OR ("c"."expira_em" > "now"())))))));



CREATE POLICY "dismiss_select_admin" ON "public"."comunicados_dismiss" FOR SELECT TO "authenticated" USING ("public"."is_comunicado_admin"());



CREATE POLICY "dismiss_select_own" ON "public"."comunicados_dismiss" FOR SELECT TO "authenticated" USING (("usuario_id" = "auth"."uid"()));



ALTER TABLE "public"."historico_controle_epi" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "historico_epi_delete_membro" ON "public"."historico_controle_epi" FOR DELETE TO "authenticated" USING (((("projeto_id" IS NOT NULL) AND "public"."checar_acesso_projeto"("projeto_id")) OR (("colaborador_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."colaboradores" "c"
  WHERE (("c"."id" = "historico_controle_epi"."colaborador_id") AND "public"."checar_acesso_projeto"("c"."projeto_id"))))) OR (("epi_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."epis" "e"
  WHERE (("e"."id" = "historico_controle_epi"."epi_id") AND "public"."checar_acesso_projeto"("e"."projeto_id")))))));



CREATE POLICY "historico_epi_insert_membro" ON "public"."historico_controle_epi" FOR INSERT TO "authenticated" WITH CHECK ((("projeto_id" IS NOT NULL) AND "public"."checar_acesso_projeto"("projeto_id") AND ("colaborador_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."colaboradores" "c"
  WHERE (("c"."id" = "historico_controle_epi"."colaborador_id") AND ("c"."projeto_id" = "historico_controle_epi"."projeto_id"))))));



CREATE POLICY "historico_epi_select_membro" ON "public"."historico_controle_epi" FOR SELECT TO "authenticated" USING (((("projeto_id" IS NOT NULL) AND "public"."checar_acesso_projeto"("projeto_id")) OR (("colaborador_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."colaboradores" "c"
  WHERE (("c"."id" = "historico_controle_epi"."colaborador_id") AND "public"."checar_acesso_projeto"("c"."projeto_id"))))) OR (("epi_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."epis" "e"
  WHERE (("e"."id" = "historico_controle_epi"."epi_id") AND "public"."checar_acesso_projeto"("e"."projeto_id")))))));



ALTER TABLE "public"."log_assinaturas_auditoria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."log_webhooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membro_projetos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "membros_controle_gestor" ON "public"."membro_projetos" TO "authenticated" USING ("public"."checar_gestor_projeto"("projeto_id"));



CREATE POLICY "membros_select_equipe" ON "public"."membro_projetos" FOR SELECT TO "authenticated" USING ("public"."checar_acesso_projeto"("projeto_id"));



ALTER TABLE "public"."plano_regras" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projetos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projetos_select_seguro" ON "public"."projetos" FOR SELECT TO "authenticated" USING ("public"."checar_acesso_projeto"("id"));



CREATE POLICY "projetos_update_gestor" ON "public"."projetos" FOR UPDATE TO "authenticated" USING ("public"."checar_gestor_projeto"("id"));



ALTER TABLE "public"."suporte_orientacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuarios_self_manage_active" ON "public"."usuarios" USING ((("auth"."uid"() = "id") AND ("status" = true))) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "usuarios_view_teammates" ON "public"."usuarios" FOR SELECT USING (("assinatura_id" = ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'assinatura_id'::"text"))::"uuid"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."checar_acesso_projeto"("p_projeto_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."checar_acesso_projeto"("p_projeto_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."checar_acesso_projeto"("p_projeto_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."checar_gestor_projeto"("p_projeto_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."checar_gestor_projeto"("p_projeto_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."checar_gestor_projeto"("p_projeto_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_membro_is_gestor"("p_usuario_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_membro_is_gestor"("p_usuario_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_membro_is_gestor"("p_usuario_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_membro_mesma_assinatura"("p_assinatura_id" "uuid", "p_usuario_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_membro_mesma_assinatura"("p_assinatura_id" "uuid", "p_usuario_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_membro_mesma_assinatura"("p_assinatura_id" "uuid", "p_usuario_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_project_access"("p_projeto_id" "uuid", "p_usuario_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_project_access"("p_projeto_id" "uuid", "p_usuario_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_project_access"("p_projeto_id" "uuid", "p_usuario_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."criar_projeto_avulso"("p_nome" "text", "p_assinatura_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."criar_projeto_avulso"("p_nome" "text", "p_assinatura_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."criar_projeto_avulso"("p_nome" "text", "p_assinatura_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_ajusta_colaborador_epis"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_ajusta_colaborador_epis"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_ajusta_colaborador_epis"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_debitar_estoque_epi"("p_epi_id" "uuid", "p_qtd" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_debitar_estoque_epi"("p_epi_id" "uuid", "p_qtd" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_debitar_estoque_epi"("p_epi_id" "uuid", "p_qtd" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_estornar_estoque_epi"("p_epi_id" "uuid", "p_qtd" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_estornar_estoque_epi"("p_epi_id" "uuid", "p_qtd" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_estornar_estoque_epi"("p_epi_id" "uuid", "p_qtd" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_gerenciar_mudanca_cargo_colaboradores?"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_gerenciar_mudanca_cargo_colaboradores?"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_gerenciar_mudanca_cargo_colaboradores?"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_gerenciar_mudanca_no_cargo_funcao"("p_modo" "text", "p_id" "uuid", "p_projeto_id" "uuid", "p_nomenclatura" "text", "p_setor_id" "uuid", "p_epi_catalogo_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_gerenciar_mudanca_no_cargo_funcao"("p_modo" "text", "p_id" "uuid", "p_projeto_id" "uuid", "p_nomenclatura" "text", "p_setor_id" "uuid", "p_epi_catalogo_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_gerenciar_mudanca_no_cargo_funcao"("p_modo" "text", "p_id" "uuid", "p_projeto_id" "uuid", "p_nomenclatura" "text", "p_setor_id" "uuid", "p_epi_catalogo_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_pode_desativar_epi"("p_epi_id" "uuid", "p_epi_catalogo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_pode_desativar_epi"("p_epi_id" "uuid", "p_epi_catalogo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_pode_desativar_epi"("p_epi_id" "uuid", "p_epi_catalogo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_validar_e_inativar_epi"("p_epi_id" "uuid", "p_catalogo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_validar_e_inativar_epi"("p_epi_id" "uuid", "p_catalogo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_validar_e_inativar_epi"("p_epi_id" "uuid", "p_catalogo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_validar_membro_projeto_podem_ver_os_demais"("p_projeto_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_validar_membro_projeto_podem_ver_os_demais"("p_projeto_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_validar_membro_projeto_podem_ver_os_demais"("p_projeto_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_assinatura_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_assinatura_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_assinatura_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_comunicado_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_comunicado_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_comunicado_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_comunicado_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_mudanca_status_assinatura"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_mudanca_status_assinatura"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_mudanca_status_assinatura"() TO "service_role";



GRANT ALL ON FUNCTION "public"."novo_registro_usuario_colaborador_depois_da_edge"() TO "anon";
GRANT ALL ON FUNCTION "public"."novo_registro_usuario_colaborador_depois_da_edge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."novo_registro_usuario_colaborador_depois_da_edge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."novo_registro_usuario_gestor"() TO "anon";
GRANT ALL ON FUNCTION "public"."novo_registro_usuario_gestor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."novo_registro_usuario_gestor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."processar_entrada_estoque"("p_projeto_id" "uuid", "p_fornecedor_id" "uuid", "p_nota_fiscal" "text", "p_data_entrada" "date", "p_itens" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."processar_entrada_estoque"("p_projeto_id" "uuid", "p_fornecedor_id" "uuid", "p_nota_fiscal" "text", "p_data_entrada" "date", "p_itens" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."processar_entrada_estoque"("p_projeto_id" "uuid", "p_fornecedor_id" "uuid", "p_nota_fiscal" "text", "p_data_entrada" "date", "p_itens" "jsonb") TO "service_role";


















GRANT ALL ON TABLE "public"."assinaturas" TO "anon";
GRANT ALL ON TABLE "public"."assinaturas" TO "authenticated";
GRANT ALL ON TABLE "public"."assinaturas" TO "service_role";



GRANT ALL ON TABLE "public"."cargo_funcoes" TO "anon";
GRANT ALL ON TABLE "public"."cargo_funcoes" TO "authenticated";
GRANT ALL ON TABLE "public"."cargo_funcoes" TO "service_role";



GRANT ALL ON TABLE "public"."catalogo_tamanhos" TO "anon";
GRANT ALL ON TABLE "public"."catalogo_tamanhos" TO "authenticated";
GRANT ALL ON TABLE "public"."catalogo_tamanhos" TO "service_role";



GRANT ALL ON TABLE "public"."colaboradores" TO "anon";
GRANT ALL ON TABLE "public"."colaboradores" TO "authenticated";
GRANT ALL ON TABLE "public"."colaboradores" TO "service_role";



GRANT ALL ON TABLE "public"."comunicados_dismiss" TO "anon";
GRANT ALL ON TABLE "public"."comunicados_dismiss" TO "authenticated";
GRANT ALL ON TABLE "public"."comunicados_dismiss" TO "service_role";



GRANT ALL ON TABLE "public"."comunicados_sistema" TO "anon";
GRANT ALL ON TABLE "public"."comunicados_sistema" TO "authenticated";
GRANT ALL ON TABLE "public"."comunicados_sistema" TO "service_role";



GRANT ALL ON TABLE "public"."controle_epi" TO "anon";
GRANT ALL ON TABLE "public"."controle_epi" TO "authenticated";
GRANT ALL ON TABLE "public"."controle_epi" TO "service_role";



GRANT ALL ON TABLE "public"."epi_catalogo" TO "anon";
GRANT ALL ON TABLE "public"."epi_catalogo" TO "authenticated";
GRANT ALL ON TABLE "public"."epi_catalogo" TO "service_role";



GRANT ALL ON TABLE "public"."epis" TO "anon";
GRANT ALL ON TABLE "public"."epis" TO "authenticated";
GRANT ALL ON TABLE "public"."epis" TO "service_role";



GRANT ALL ON TABLE "public"."fornecedores" TO "anon";
GRANT ALL ON TABLE "public"."fornecedores" TO "authenticated";
GRANT ALL ON TABLE "public"."fornecedores" TO "service_role";



GRANT ALL ON TABLE "public"."historico_alteracao_em_cargo_funcoes" TO "anon";
GRANT ALL ON TABLE "public"."historico_alteracao_em_cargo_funcoes" TO "authenticated";
GRANT ALL ON TABLE "public"."historico_alteracao_em_cargo_funcoes" TO "service_role";



GRANT ALL ON TABLE "public"."historico_cargos" TO "anon";
GRANT ALL ON TABLE "public"."historico_cargos" TO "authenticated";
GRANT ALL ON TABLE "public"."historico_cargos" TO "service_role";



GRANT ALL ON TABLE "public"."historico_controle_epi" TO "anon";
GRANT ALL ON TABLE "public"."historico_controle_epi" TO "authenticated";
GRANT ALL ON TABLE "public"."historico_controle_epi" TO "service_role";



GRANT ALL ON TABLE "public"."log_assinaturas_auditoria" TO "anon";
GRANT ALL ON TABLE "public"."log_assinaturas_auditoria" TO "authenticated";
GRANT ALL ON TABLE "public"."log_assinaturas_auditoria" TO "service_role";



GRANT ALL ON TABLE "public"."log_webhooks" TO "anon";
GRANT ALL ON TABLE "public"."log_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."log_webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."membro_projetos" TO "anon";
GRANT ALL ON TABLE "public"."membro_projetos" TO "authenticated";
GRANT ALL ON TABLE "public"."membro_projetos" TO "service_role";



GRANT ALL ON TABLE "public"."plano_regras" TO "anon";
GRANT ALL ON TABLE "public"."plano_regras" TO "authenticated";
GRANT ALL ON TABLE "public"."plano_regras" TO "service_role";



GRANT ALL ON TABLE "public"."projetos" TO "anon";
GRANT ALL ON TABLE "public"."projetos" TO "authenticated";
GRANT ALL ON TABLE "public"."projetos" TO "service_role";



GRANT ALL ON TABLE "public"."registro_entradas" TO "anon";
GRANT ALL ON TABLE "public"."registro_entradas" TO "authenticated";
GRANT ALL ON TABLE "public"."registro_entradas" TO "service_role";



GRANT ALL ON TABLE "public"."setores" TO "anon";
GRANT ALL ON TABLE "public"."setores" TO "authenticated";
GRANT ALL ON TABLE "public"."setores" TO "service_role";



GRANT ALL ON TABLE "public"."suporte_orientacoes" TO "anon";
GRANT ALL ON TABLE "public"."suporte_orientacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."suporte_orientacoes" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."v_controle_epi" TO "anon";
GRANT ALL ON TABLE "public"."v_controle_epi" TO "authenticated";
GRANT ALL ON TABLE "public"."v_controle_epi" TO "service_role";



GRANT ALL ON TABLE "public"."v_sugestao_compras" TO "anon";
GRANT ALL ON TABLE "public"."v_sugestao_compras" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sugestao_compras" TO "service_role";



GRANT ALL ON TABLE "public"."view_status_acesso" TO "anon";
GRANT ALL ON TABLE "public"."view_status_acesso" TO "authenticated";
GRANT ALL ON TABLE "public"."view_status_acesso" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































