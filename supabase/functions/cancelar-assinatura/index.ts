import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import {
  criarSupabaseAdmin,
  obterUsuarioAutenticado,
  validarProprietarioAssinatura,
} from "../_shared/assinaturaAuth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    const stripe = stripeSecret
      ? new Stripe(stripeSecret, {
          apiVersion: '2022-11-15',
          httpClient: Stripe.createFetchHttpClient(),
        })
      : null

    const supabaseAdmin = criarSupabaseAdmin()
    const authUser = await obterUsuarioAutenticado(req, supabaseAdmin)
    if (!authUser) throw new Error('Não autenticado.')

    const { assinaturaId, confirmacaoEmail } = await req.json()
    if (!assinaturaId || !confirmacaoEmail) {
      throw new Error('assinaturaId e confirmacaoEmail são obrigatórios.')
    }

    const emailUsuario = (authUser.email ?? '').trim().toLowerCase()
    if (emailUsuario !== String(confirmacaoEmail).trim().toLowerCase()) {
      throw new Error('O e-mail de confirmação não confere com o titular da conta.')
    }

    const assinatura = await validarProprietarioAssinatura(supabaseAdmin, assinaturaId, authUser.id)

    await supabaseAdmin.rpc('set_config', {
      name: 'app.alterado_por',
      value: 'edge_function_cancelar_assinatura',
      is_local: false,
    })

    if (assinatura.stripe_subscription_id) {
      if (!stripe) {
        throw new Error('STRIPE_SECRET_KEY ausente — não é possível cancelar assinatura paga localmente.')
      }

      const subscription = await stripe.subscriptions.update(assinatura.stripe_subscription_id, {
        cancel_at_period_end: true,
        metadata: {
          motivo_encerramento: 'cancelar_conta',
          assinatura_id: assinaturaId,
        },
      })

      const fimPeriodo = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null

      const { error: updateError } = await supabaseAdmin
        .from('assinaturas')
        .update({
          cancel_at_period_end: true,
          cancel_at: fimPeriodo,
          plano_fim_periodo: fimPeriodo,
          encerrar_conta_agendado: true,
        })
        .eq('id', assinaturaId)

      if (updateError) throw new Error(`Falha ao registrar cancelamento: ${updateError.message}`)

      return new Response(
        JSON.stringify({
          success: true,
          modo: 'agendado',
          mensagem: 'Cancelamento agendado para o fim do período vigente.',
          dataEncerramento: fimPeriodo,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const { error: inativarUsuariosError } = await supabaseAdmin
      .from('usuarios')
      .update({ status: false })
      .eq('assinatura_id', assinaturaId)

    if (inativarUsuariosError) {
      throw new Error(`Falha ao inativar usuários: ${inativarUsuariosError.message}`)
    }

    // Soft-disable: projetos e notificações param imediatamente
    const { error: desativarProjetosError } = await supabaseAdmin
      .from('projetos')
      .update({ status: false, notificar_vencimentos_email: false })
      .eq('assinatura_id', assinaturaId)

    if (desativarProjetosError) {
      throw new Error(`Falha ao desativar projetos: ${desativarProjetosError.message}`)
    }

    const { error: cancelarAssinaturaError } = await supabaseAdmin
      .from('assinaturas')
      .update({
        plano_status: 'canceled',
        cancel_at_period_end: false,
        cancel_at: new Date().toISOString(),
        encerrar_conta_agendado: false,
      })
      .eq('id', assinaturaId)

    if (cancelarAssinaturaError) {
      throw new Error(`Falha ao cancelar assinatura: ${cancelarAssinaturaError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        modo: 'imediato',
        mensagem: 'Conta encerrada. Você será desconectado.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
