import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Stripe } from 'https://esm.sh/stripe@12.0.0'
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

/** Impede open-redirect via returnUrl forjado no client. */
function hostsPermitidos(): Set<string> {
  const fixos = [
    'controleepi.proativaweb.com.br',
    'controleepi.com',
    'www.controleepi.com',
    'localhost',
    '127.0.0.1',
  ]
  const extra = (Deno.env.get('ALLOWED_RETURN_HOSTS') || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  return new Set([...fixos, ...extra])
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) throw new Error('STRIPE_SECRET_KEY ausente.')

    const stripe = new Stripe(stripeSecret, { apiVersion: '2022-11-15' })
    const supabase = criarSupabaseAdmin()

    const authUser = await obterUsuarioAutenticado(req, supabase)
    if (!authUser) throw new Error('Não autenticado.')

    const { assinaturaId, returnUrl } = await req.json()
    if (!assinaturaId) throw new Error('assinaturaId é obrigatório.')

    const assinatura = await validarProprietarioAssinatura(supabase, assinaturaId, authUser.id)

    if (!assinatura.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Cliente Stripe não encontrado. Contrate um plano pago primeiro.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const destinoRetorno = returnUrl || `${req.headers.get('origin') || ''}/configurar-projeto`
    assertUrlRetornoPermitida(destinoRetorno, 'returnUrl')

    const session = await stripe.billingPortal.sessions.create({
      customer: assinatura.stripe_customer_id,
      return_url: destinoRetorno,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
