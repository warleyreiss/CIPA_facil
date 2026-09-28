import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Busca as regras do banco
    const { data: regras, error: dbError } = await supabase
      .from('plano_regras')
      .select('*')
      .order('quantidade_projetos', { ascending: true })

    if (dbError) throw dbError

    // 2. Busca os detalhes no Stripe — só inclui preço/produto ativos
    const planosComPreco = await Promise.all((regras || []).map(async (regra) => {
      try {
        const nomePlano = String(regra.nome_plano || '').trim().toUpperCase()
        // Planos internos/teste não entram no listing comercial (upgrade/cadastro).
        if (
          nomePlano.includes('DESENV') ||
          nomePlano.includes('INTERNO') ||
          nomePlano.includes('TESTE')
        ) {
          return null
        }

        if (!regra.stripe_price_id) {
          console.warn(`plano_regras sem stripe_price_id: ${regra.nome_plano ?? regra.id}`)
          return null
        }

        const price = await stripe.prices.retrieve(regra.stripe_price_id, {
          expand: ['product'],
        })

        if (!price.active) {
          console.info(`Preço inativo no Stripe, omitido: ${regra.stripe_price_id}`)
          return null
        }

        const product = price.product
        if (
          product &&
          typeof product === 'object' &&
          'deleted' in product &&
          (product as { deleted?: boolean }).deleted
        ) {
          console.info(`Produto removido no Stripe, omitido: ${regra.stripe_price_id}`)
          return null
        }
        if (
          product &&
          typeof product === 'object' &&
          'active' in product &&
          (product as Stripe.Product).active === false
        ) {
          console.info(`Produto inativo no Stripe, omitido: ${regra.stripe_price_id}`)
          return null
        }

        const eGratuito = price.unit_amount === 0
        const currency = (price.currency || 'brl').toUpperCase()

        return {
          id: regra.stripe_price_id,
          nome: regra.nome_plano,
          limite: regra.quantidade_projetos,
          valor_num: (price.unit_amount! / 100),
          e_gratuito: eGratuito,
          valor_formatado: eGratuito
            ? 'Grátis'
            : (price.unit_amount! / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: currency === 'BRL' ? 'BRL' : currency,
              }),
          intervalo: price.recurring?.interval === 'month' ? 'mês' : 'ano',
          stripe_active: true,
        }
      } catch (e) {
        console.error(`Erro ao buscar preço ${regra.stripe_price_id}:`, e.message)
        return null
      }
    }))

    const planosValidos = planosComPreco.filter((p) => p !== null)

    return new Response(JSON.stringify(planosValidos), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("❌ Erro get-plans:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
