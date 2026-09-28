import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import {
  criarSupabaseAdmin,
  obterUsuarioAutenticado,
  validarAssinaturaSignup,
  validarLimitesPlanoAlvo,
  validarPriceIdComercial,
  validarProprietarioAssinatura,
} from "../_shared/assinaturaAuth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function hostsPermitidos(): Set<string> {
  const fixos = [
    'localhost',
    '127.0.0.1',
  ]
  const extra = (Deno.env.get('ALLOWED_RETURN_HOSTS') || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  return new Set([...fixos, ...extra])
}

/** Impede open-redirect via successUrl/cancelUrl forjados no client. */
function assertUrlRetornoPermitida(url: string, label: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`${label} inválida.`)
  }

  const host = parsed.hostname.toLowerCase()
  if (!hostsPermitidos().has(host)) {
    throw new Error(`${label} não permitida para este host.`)
  }

  const isLocal = host === 'localhost' || host === '127.0.0.1'
  if (!isLocal && parsed.protocol !== 'https:') {
    throw new Error(`${label} deve usar HTTPS.`)
  }
}

function normalizarEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const e = raw.trim().toLowerCase()
  if (!e || !e.includes('@')) return null
  return e
}

function appendAssId(url: string, assinaturaId: string): string {
  const u = new URL(url)
  u.searchParams.set('ass_id', assinaturaId)
  return u.toString()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) throw new Error('STRIPE_SECRET_KEY ausente.')

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = criarSupabaseAdmin()
    const body = await req.json()
    const {
      priceId,
      assinaturaId: assinaturaIdBody,
      userId,
      userEmail,
      successUrl,
      cancelUrl,
      returnUrl,
      tipoCadastro,
      reservarSignup,
    } = body

    if (!priceId) {
      throw new Error('priceId é obrigatório.')
    }

    const authUser = await obterUsuarioAutenticado(req, supabase)

    await validarPriceIdComercial(supabase, priceId)

    // Plano gratuito: só reserva assinatura active INICIANTE (sem Stripe session)
    if (body.planoGratuito === true) {
      if (authUser) throw new Error('Plano gratuito de cadastro não se aplica a usuário autenticado.')
      const emailFree = normalizarEmail(userEmail)
      if (!emailFree) throw new Error('userEmail é obrigatório no plano gratuito.')

      const { data: regra } = await supabase
        .from('plano_regras')
        .select('stripe_price_id, nome_plano')
        .eq('stripe_price_id', priceId)
        .maybeSingle()

      const nome = String(regra?.nome_plano || '').toUpperCase()
      const gratuito = nome === 'INICIANTE' || nome.includes('GRATUIT')

      if (!gratuito) {
        throw new Error('priceId não corresponde a um plano gratuito.')
      }

      const tipo =
        tipoCadastro === 'EMPRESARIAL' || tipoCadastro === 'AUTONOMO'
          ? tipoCadastro
          : 'AUTONOMO'
      const novaId = crypto.randomUUID()
      const { error: insertErr } = await supabase.from('assinaturas').insert({
        id: novaId,
        plano_status: 'active',
        assinatura_tipo: tipo,
        plano_tipo: 'INICIANTE',
        plano_regra_id: priceId,
        checkout_email: emailFree,
      })
      if (insertErr) throw new Error(`Falha ao ativar plano gratuito: ${insertErr.message}`)

      return new Response(JSON.stringify({ mode: 'free', assinaturaId: novaId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const destinoSucessoBase = successUrl || returnUrl || `${req.headers.get('origin') || ''}/sucesso-upgrade`
    const destinoCancelamento = cancelUrl || `${req.headers.get('origin') || ''}/upgrade?cancelado=1`

    assertUrlRetornoPermitida(destinoSucessoBase, 'successUrl')
    assertUrlRetornoPermitida(destinoCancelamento, 'cancelUrl')

    const emailCheckout = normalizarEmail(userEmail) || normalizarEmail(authUser?.email)

    let assinaturaId: string = typeof assinaturaIdBody === 'string' ? assinaturaIdBody : ''
    let assinatura: {
      stripe_subscription_id: string | null
      stripe_customer_id: string | null
      plano_status: string | null
    }

    // Signup pré-login: edge reserva a assinatura (cliente não pode mais INSERT)
    if (!authUser && (reservarSignup === true || !assinaturaId)) {
      if (!emailCheckout) {
        throw new Error('userEmail é obrigatório no checkout de cadastro.')
      }

      const tipo =
        tipoCadastro === 'EMPRESARIAL' || tipoCadastro === 'AUTONOMO'
          ? tipoCadastro
          : 'AUTONOMO'

      const novaId = crypto.randomUUID()
      const { error: insertErr } = await supabase.from('assinaturas').insert({
        id: novaId,
        plano_status: 'incomplete',
        assinatura_tipo: tipo,
        plano_tipo: 'INICIANTE',
        plano_regra_id: priceId,
        checkout_email: emailCheckout,
      })
      if (insertErr) throw new Error(`Falha ao reservar assinatura: ${insertErr.message}`)

      assinaturaId = novaId
      assinatura = {
        stripe_subscription_id: null,
        stripe_customer_id: null,
        plano_status: 'incomplete',
      }
    } else if (!authUser) {
      if (!assinaturaId) throw new Error('assinaturaId é obrigatório.')
      assinatura = await validarAssinaturaSignup(supabase, assinaturaId)
      // Só grava checkout_email na 1ª vez (imutável depois — anti-overwrite)
      if (emailCheckout) {
        await supabase
          .from('assinaturas')
          .update({ checkout_email: emailCheckout })
          .eq('id', assinaturaId)
          .is('proprietario_id', null)
          .is('checkout_email', null)
      }
    } else {
      if (!assinaturaId) throw new Error('assinaturaId é obrigatório.')
      assinatura = await validarProprietarioAssinatura(supabase, assinaturaId, authUser.id)
      await validarLimitesPlanoAlvo(supabase, assinaturaId, priceId)
      if (emailCheckout) {
        await supabase
          .from('assinaturas')
          .update({ checkout_email: emailCheckout })
          .eq('id', assinaturaId)
          .is('checkout_email', null)
      }
    }

    // Assinante existente: atualiza plano no Stripe sem criar nova assinatura
    if (assinatura.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(assinatura.stripe_subscription_id)
      const itemId = subscription.items.data[0]?.id
      if (!itemId) throw new Error('Item de assinatura não encontrado no Stripe.')

      const atual = subscription.items.data[0]?.price?.id
      if (atual === priceId) {
        return new Response(JSON.stringify({ mode: 'updated', redirectUrl: destinoSucessoBase }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      await stripe.subscriptions.update(assinatura.stripe_subscription_id, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: 'create_prorations',
        metadata: {
          assinatura_id: assinaturaId,
          user_id: userId || authUser?.id || '',
          checkout_email: emailCheckout || '',
        },
      })

      return new Response(JSON.stringify({ mode: 'updated', redirectUrl: destinoSucessoBase }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (!emailCheckout && !assinatura.stripe_customer_id) {
      throw new Error('E-mail obrigatório para iniciar o checkout.')
    }

    const destinoSucesso = appendAssId(destinoSucessoBase, assinaturaId)

    const session = await stripe.checkout.sessions.create({
      customer: assinatura.stripe_customer_id || undefined,
      customer_email: assinatura.stripe_customer_id ? undefined : emailCheckout || undefined,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      client_reference_id: assinaturaId,
      success_url: destinoSucesso,
      cancel_url: destinoCancelamento,
      subscription_data: {
        metadata: {
          assinatura_id: assinaturaId,
          user_id: userId || authUser?.id || '',
          checkout_email: emailCheckout || '',
        },
      },
      metadata: {
        assinatura_id: assinaturaId,
        user_id: userId || authUser?.id || '',
        checkout_email: emailCheckout || '',
      },
      allow_promotion_codes: true,
    })

    return new Response(
      JSON.stringify({
        mode: 'checkout',
        url: session.url,
        assinaturaId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
