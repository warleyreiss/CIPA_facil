import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import {
  criarSupabaseAdmin,
  obterUsuarioAutenticado,
  obterPriceIdPlanoIniciante,
  validarLimitesPlanoAlvo,
  validarProprietarioAssinatura,
} from "../_shared/assinaturaAuth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabaseAdmin = criarSupabaseAdmin()
    const authUser = await obterUsuarioAutenticado(req, supabaseAdmin)
    if (!authUser) throw new Error('Não autenticado.')

    const { assinaturaId, priceId } = await req.json()
    if (!assinaturaId || !priceId) {
      throw new Error('Parâmetros assinaturaId e priceId são obrigatórios.')
    }

    const priceIdIniciante = await obterPriceIdPlanoIniciante(supabaseAdmin)
    if (priceId !== priceIdIniciante) {
      throw new Error('priceId inválido para downgrade gratuito.')
    }

    const assinatura = await validarProprietarioAssinatura(supabaseAdmin, assinaturaId, authUser.id)
    await validarLimitesPlanoAlvo(supabaseAdmin, assinaturaId, priceId)

    if (assinatura.stripe_subscription_id) {
      const subId = assinatura.stripe_subscription_id as string
      try {
        await stripe.subscriptions.update(subId, {
          metadata: {
            motivo_encerramento: 'downgrade_gratuito',
            assinatura_id: assinaturaId,
          },
        })
        await stripe.subscriptions.cancel(subId)
      } catch (stripeError: unknown) {
        const err = stripeError as { type?: string; code?: string; message?: string }
        // Já cancelada/inexistente no Stripe: segue para alinhar o banco
        const jaInexistente =
          err.type === 'StripeInvalidRequestError' &&
          (err.code === 'resource_missing' ||
            /no such subscription/i.test(err.message ?? '') ||
            /canceled/i.test(err.message ?? ''))
        if (!jaInexistente) {
          throw new Error(`Erro ao cancelar no Stripe: ${err.message ?? 'falha desconhecida'}`)
        }
      }
    }

    await supabaseAdmin.rpc('set_config', {
      name: 'app.alterado_por',
      value: 'edge_function_downgrade',
      is_local: false,
    }).then(({ error }) => {
      if (error) console.warn('set_config app.alterado_por:', error.message)
    })

    const { error: erroUpdate } = await supabaseAdmin
      .from('assinaturas')
      .update({
        plano_tipo: 'INICIANTE',
        plano_status: 'active',
        plano_regra_id: priceId,
        stripe_subscription_id: null,
        stripe_price_id: null,
        proxima_fatura: null,
        plano_fim_periodo: null,
        cancel_at_period_end: false,
        cancel_at: null,
        stripe_latest_invoice_url: null,
        data_falha_pagamento: null,
        motivo_falha: null,
        encerrar_conta_agendado: false,
      })
      .eq('id', assinaturaId)

    if (erroUpdate) {
      throw new Error(`Falha ao atualizar banco: ${erroUpdate.message}`)
    }

    await supabaseAdmin
      .from('usuarios')
      .update({ status: true })
      .eq('assinatura_id', assinaturaId)

    return new Response(
      JSON.stringify({ success: true, message: 'Downgrade para plano gratuito realizado.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
