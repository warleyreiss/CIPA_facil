import { useContext, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { ProjetoContextType } from '../contexts/types/projetoContext.types';
import { ProjetoContext } from './projetoContextInstance';
import { useUsuario } from './hooks/useUsuario';
import {
  useProjetoAtivo,
  resolverProjetoAtivo,
  dadosProjetoDeVinculo,
  type VinculoProjeto,
} from './hooks/useProjetoAtivo';
import { useOnboarding } from './hooks/useOnboarding';
import { useAssinatura } from './hooks/useAssinatura';
import { userDataSemanticoIgual } from './utils/contextStateUtils';
import { aplicarIndicacaoParceiroPendente } from '../lib/parceiroService';
import { registrarUltimoAcesso } from '../lib/usuarioService';
import { provisionarUsuarioOAuthIfNeeded } from '../lib/userService';
import {
  limparDadosSessaoAplicacao,
  sanitizarProjetoPersistido,
  marcarWizardImportacaoPendente,
  marcarConfigTourPendente,
} from '../lib/storageService';
import { isPlanoGratuito } from '../lib/recursosPlano';

export { ProjetoContext };

const SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;

export function ProjetoProvider({ children }: { children: ReactNode }) {
  const usuario = useUsuario();
  const projeto = useProjetoAtivo();
  const onboarding = useOnboarding(usuario.userData?.id ?? null, projeto.projetoId);
  const assinatura = useAssinatura(usuario.userData?.id || null);

  const {
    setUserData,
    setIsOverlayVisible,
    setAuthError,
    setEmailConfirmado,
    setAuthResolvido,
    limparUsuario,
  } = usuario;
  const { setAssinatura, sincronizarAcesso, limparAssinatura } = assinatura;
  const {
    selecionarProjeto,
    setFuncaoUsuario,
    setIsModalSelecaoOpen,
    resetProjetoSessao,
    projetoId,
  } = projeto;
  const { verificarStatusOnboarding } = onboarding;

  const userDataRef = useRef(usuario.userData);
  userDataRef.current = usuario.userData;

  const projetoIdRef = useRef(projetoId);
  projetoIdRef.current = projetoId;

  const statusOnboardingRef = useRef(onboarding.statusOnboarding);
  statusOnboardingRef.current = onboarding.statusOnboarding;

  const inicializandoRef = useRef(false);
  const ultimaSyncRef = useRef(0);
  const sessaoInicializadaRef = useRef(false);

  const limparEstados = useCallback(() => {
    limparUsuario();
    resetProjetoSessao();
    limparAssinatura();
    limparDadosSessaoAplicacao();
    sessaoInicializadaRef.current = false;
    ultimaSyncRef.current = 0;
  }, [limparUsuario, resetProjetoSessao, limparAssinatura]);

  const selecionarProjetoComUsuario = useCallback(
    (id: string, nome: string, logo: string | null = null, usuarioIdOverride?: string | null) => {
      const userId = usuarioIdOverride ?? userDataRef.current?.id;
      selecionarProjeto(id, nome, logo, userId);
      if (userId) {
        verificarStatusOnboarding(userId, id, true);
      }
    },
    [selecionarProjeto, verificarStatusOnboarding]
  );

  const inicializarUsuario = useCallback(
    async (sessionUser: any, isSilent = false, force = false) => {
      const userAtual = sessionUser || userDataRef.current;

      if (!userAtual) {
        limparEstados();
        return;
      }

      if (
        isSilent &&
        !force &&
        sessaoInicializadaRef.current &&
        userDataRef.current?.id === userAtual.id &&
        Date.now() - ultimaSyncRef.current < SYNC_MIN_INTERVAL_MS
      ) {
        return;
      }

      if (inicializandoRef.current && isSilent) {
        return;
      }

      const deveMostrarOverlay = !isSilent && !userDataRef.current?.id;
      if (deveMostrarOverlay) setIsOverlayVisible(true);

      inicializandoRef.current = true;
      setAuthError(null);

      let projetoIdResolvido: string | null = projetoIdRef.current;

      try {
        const confirmado = !!userAtual.email_confirmed_at || !!userAtual.confirmed_at;
        setEmailConfirmado(confirmado);

        if (!confirmado) {
          setUserData((prev: any) => {
            const parcial = { id: userAtual.id, email: userAtual.email };
            return userDataSemanticoIgual(prev, parcial) ? prev : parcial;
          });
          return;
        }

        await provisionarUsuarioOAuthIfNeeded(userAtual);

        sanitizarProjetoPersistido(userAtual.id);

        const { data: userDb, error: uError } = await supabase
          .from('usuarios')
          .select(`
            id, email, nome_completo, foto_url, status, status_cadastro, onboarding_concluido, ultimo_acesso,
            assinatura_id,
            assinaturas!usuarios_assinatura_id_fkey (
              id, proprietario_id, assinatura_tipo, plano_status, plano_tipo, dias_tolerancia,
              data_falha_pagamento, plano_fim_periodo, proxima_fatura,
              plano_regra_id, stripe_price_id, stripe_customer_id, cancel_at_period_end,
              encerrar_conta_agendado,
              data_inicio, usar_logo_padrao_projetos, logo_padrao_url,
              cortesia, cortesia_em, cortesia_motivo,
              plano_regras (*)
            )
          `)
          .eq('id', userAtual.id)
          .single();

        if (uError) {
          console.error('Erro ao carregar perfil do usuário:', uError);
          setAuthError('Não foi possível validar sua sessão. Atualize a página e tente novamente.');
          return;
        }

        if (!userDb || userDb.status === false) {
          await supabase.auth.signOut();
          limparEstados();
          setAuthError('Sua conta foi desativada e não possui mais acesso.');
          return;
        }

        let assData = Array.isArray(userDb.assinaturas) ? userDb.assinaturas[0] : userDb.assinaturas;

        // Convidados têm usuarios.assinatura_id, mas o embed pode vir vazio conforme a FK
        if (!assData?.id && userDb.assinatura_id) {
          const { data: assPorId } = await supabase
            .from('assinaturas')
            .select(
              `id, proprietario_id, assinatura_tipo, plano_status, plano_tipo, dias_tolerancia,
               data_falha_pagamento, plano_fim_periodo, proxima_fatura,
               plano_regra_id, stripe_price_id, stripe_customer_id, cancel_at_period_end,
               encerrar_conta_agendado,
               data_inicio, usar_logo_padrao_projetos, logo_padrao_url,
               cortesia, cortesia_em, cortesia_motivo, plano_regras (*)`
            )
            .eq('id', userDb.assinatura_id)
            .maybeSingle();
          if (assPorId) assData = assPorId;
        }

        const statusDeAcessoCalculado = sincronizarAcesso(userDb.status !== false, assData);

        if (
          statusDeAcessoCalculado === 'ASSINATURA_CANCELADA' ||
          statusDeAcessoCalculado === 'INATIVO_ADMIN'
        ) {
          await supabase.auth.signOut();
          limparEstados();

          const msgErro =
            statusDeAcessoCalculado === 'ASSINATURA_CANCELADA'
              ? 'Sua assinatura foi cancelada. O acesso está bloqueado de forma permanente.'
              : 'Acesso bloqueado por inatividade administrativa.';

          setAuthError(msgErro);
          return;
        }

        setAssinatura(assData);

        const planoGratuito = isPlanoGratuito(assData?.plano_tipo);

        const { data: vinculos } = await supabase
          .from('membro_projetos')
          .select('projeto_id, funcao, projetos(nome, logo_url)')
          .eq('usuario_id', userAtual.id)
          .eq('status', true);

        const roles = (vinculos || []) as VinculoProjeto[];
        const resolucao = resolverProjetoAtivo(roles, userAtual.id, planoGratuito);

        if (resolucao.abrirSelecao) {
          if (resolucao.funcaoFallback) setFuncaoUsuario(resolucao.funcaoFallback);
          setIsModalSelecaoOpen(true);
          projetoIdResolvido = null;
        } else if (resolucao.vinculo) {
          const dados = dadosProjetoDeVinculo(resolucao.vinculo);
          projetoIdResolvido = dados.id;
          setFuncaoUsuario(dados.funcao);
          // userData ainda pode não estar no state — passa o id da sessão explicitamente
          selecionarProjetoComUsuario(dados.id, dados.nome, dados.logo, userAtual.id);
          setIsModalSelecaoOpen(false);

          // Cadastro novo (plano Iniciante auto-entra sem passar por SelecaoProjeto):
          // agenda wizard + tour de config nesta sessão.
          if (!userDb.onboarding_concluido) {
            marcarWizardImportacaoPendente(dados.id);
            marcarConfigTourPendente(dados.id);
          }
        }

        setUserData((prev: any) => (userDataSemanticoIgual(prev, userDb) ? prev : userDb));
        sessaoInicializadaRef.current = true;
        ultimaSyncRef.current = Date.now();

        if (!isSilent || force) {
          registrarUltimoAcesso(userAtual.id).catch((err) => {
            console.error('Erro ao registrar último acesso:', err);
          });
        }

        const projetoMudou = projetoIdResolvido !== projetoIdRef.current;
        if (!isSilent || projetoMudou || !statusOnboardingRef.current) {
          verificarStatusOnboarding(userAtual.id, projetoIdResolvido);
        }

        if (projetoIdResolvido) {
          aplicarIndicacaoParceiroPendente().catch((err) => {
            console.error('Falha ao aplicar indicação de parceiro:', err);
          });
        }
      } catch {
        await supabase.auth.signOut();
        limparEstados();
        setAuthError('Erro ao validar sessão. Tente logar novamente.');
      } finally {
        inicializandoRef.current = false;
        if (deveMostrarOverlay) setIsOverlayVisible(false);
      }
    },
    [
      limparEstados,
      setUserData,
      setIsOverlayVisible,
      setAuthError,
      setEmailConfirmado,
      setAssinatura,
      sincronizarAcesso,
      selecionarProjetoComUsuario,
      setFuncaoUsuario,
      setIsModalSelecaoOpen,
      verificarStatusOnboarding,
    ]
  );

  const atualizarStatusOnboarding = useCallback(async () => {
    if (usuario.userData?.id && projeto.projetoId) {
      await verificarStatusOnboarding(usuario.userData.id, projeto.projetoId, true);
    }
  }, [usuario.userData?.id, projeto.projetoId, verificarStatusOnboarding]);

  const inicializarUsuarioRef = useRef(inicializarUsuario);
  inicializarUsuarioRef.current = inicializarUsuario;

  const limparEstadosRef = useRef(limparEstados);
  limparEstadosRef.current = limparEstados;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        limparEstadosRef.current();
        setAuthResolvido(true);
        return;
      }

      if (!session?.user) {
        setAuthResolvido(true);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // Overlay só nestes eventos — TOKEN_REFRESHED / foco de aba NÃO passam por aqui
        inicializarUsuarioRef.current(session.user, false, true).finally(() => setAuthResolvido(true));
        return;
      }

      // TOKEN_REFRESHED, USER_UPDATED, etc.: sincroniza silencioso se necessário, sem vinheta
      setAuthResolvido(true);
    });

    return () => subscription.unsubscribe();
  }, [setAuthResolvido]);

  const planoGratuito = isPlanoGratuito(assinatura.assinatura?.plano_tipo);

  const contextValue = useMemo<ProjetoContextType>(
    () => ({
      userData: usuario.userData,
      projetoId: projeto.projetoId,
      projetoNome: projeto.projetoNome,
      projetoLogo: projeto.projetoLogo,
      funcaoUsuario: projeto.funcaoUsuario,
      isBlocked: assinatura.isBlocked,
      statusAcesso: assinatura.statusAcesso,
      isOverlayVisible: usuario.isOverlayVisible,
      authResolvido: usuario.authResolvido,
      authError: usuario.authError,
      emailConfirmado: usuario.emailConfirmado,
      planoStatus: assinatura.planoStatus,
      assinatura: assinatura.assinatura,
      statusOnboarding: onboarding.statusOnboarding,
      statusProjetoId: onboarding.statusProjetoId,
      isModalSelecaoOpen: projeto.isModalSelecaoOpen,
      setIsModalSelecaoOpen: projeto.setIsModalSelecaoOpen,
      inicializarUsuario,
      selecionarProjeto: selecionarProjetoComUsuario,
      atualizarStatusOnboarding,
      setAssinatura,
      planoGratuito,
    }),
    [
      usuario.userData,
      usuario.isOverlayVisible,
      usuario.authResolvido,
      usuario.authError,
      usuario.emailConfirmado,
      projeto.projetoId,
      projeto.projetoNome,
      projeto.projetoLogo,
      projeto.funcaoUsuario,
      projeto.isModalSelecaoOpen,
      projeto.setIsModalSelecaoOpen,
      assinatura.isBlocked,
      assinatura.statusAcesso,
      assinatura.planoStatus,
      assinatura.assinatura,
      onboarding.statusOnboarding,
      onboarding.statusProjetoId,
      inicializarUsuario,
      selecionarProjetoComUsuario,
      atualizarStatusOnboarding,
      setAssinatura,
      planoGratuito,
    ]
  );

  return <ProjetoContext.Provider value={contextValue}>{children}</ProjetoContext.Provider>;
}

export const useProjeto = () => {
  const context = useContext(ProjetoContext);
  if (!context) throw new Error('useProjeto deve ser usado dentro de um ProjetoProvider');
  return context;
};
