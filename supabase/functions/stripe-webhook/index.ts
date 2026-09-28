import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

/**
 * Webhook Stripe — processa o evento antes do ACK.
 * Falha → HTTP 500 para o Stripe retentar; sucesso → 200.
 * Idempotência: só ignora event_id se status=processed/skipped/ignored.
 */

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

/** Janela em que um "processing" é considerado em andamento (evita reentrada). */
const PROCESSING_LOCK_MS = 120_000

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Sem assinatura', { status: 400 })

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string
  let event: Stripe.Event

  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(
      body, signature, webhookSecret, undefined, cryptoProvider
    )
  } catch (err: any) {
    console.error(`❌ Erro de Assinatura: ${err.message}`)
    return new Response(`Erro de validação: ${err.message}`, { status: 400 })
  }

  const processarEvento = async (): Promise<{ ok: boolean; error?: string }> => {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const podeProcessar = await reservarProcessamento(supabase, event)
    if (!podeProcessar) {
      console.log(`Evento ignorado (já processado ou em andamento): ${event.id}`)
      return { ok: true }
    }

    try {
      await supabase.rpc('set_config', {
        name: 'app.alterado_por',
        value: 'webhook_stripe',
        is_local: false
      })

      // Eventos sem subscription (checkout expirado etc.)
      if (event.type === 'checkout.session.expired') {
        await handleCheckoutExpirado(supabase, event.data.object as Stripe.Checkout.Session)
        await marcarStatusEvento(supabase, event.id, 'processed', null)
        return { ok: true }
      }

      const session = event.data.object as any
      const subscriptionId = extrairSubscriptionId(session)

      if (!subscriptionId) {
        await marcarStatusEvento(supabase, event.id, 'skipped', 'Sem subscription no payload')
        return { ok: true }
      }

      const internalAssId = await obterIdInternoAssinatura(supabase, subscriptionId, session, event.type)

      const actions: Record<string, () => Promise<void>> = {
        'checkout.session.completed':    () => handleCheckoutSucesso(supabase, subscriptionId, internalAssId),
        'invoice.payment_succeeded':     () => handlePagamentoSucesso(supabase, subscriptionId, internalAssId),
        'invoice.payment_failed':        () => handleFalhaPagamento(supabase, subscriptionId, internalAssId, session),
        'customer.subscription.updated': () => handleAtualizacao(supabase, subscriptionId, internalAssId),
        'customer.subscription.deleted': () => handleCancelamento(supabase, subscriptionId, internalAssId, session),
      }

      const executarAcao = actions[event.type]
      if (executarAcao) {
        await executarAcao()
        await marcarStatusEvento(supabase, event.id, 'processed', null)
      } else {
        await marcarStatusEvento(supabase, event.id, 'ignored_unmapped_event', null)
      }
      return { ok: true }
    } catch (err: any) {
      console.error(`❌ Erro no processamento do evento ${event.id}: ${err.message}`)
      await marcarStatusEvento(supabase, event.id, 'failed', err.message)
      return { ok: false, error: err.message }
    }
  }

  // Processa antes do ACK: falha → 5xx para o Stripe retentar.
  // (ACK antecipado com waitUntil impede retentativas e deixa entitlement inconsistente.)
  const resultado = await processarEvento()
  if (!resultado.ok) {
    return new Response(JSON.stringify({ received: false, error: resultado.error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

/** Só processa se não estiver processed; failed/processing antigo pode retentar. */
async function reservarProcessamento(supabase: any, event: Stripe.Event): Promise<boolean> {
  const { data: existente } = await supabase
    .from('log_webhooks')
    .select('id, status, created_at')
    .eq('event_id', event.id)
    .maybeSingle()

  if (existente?.status === 'processed' || existente?.status === 'ignored_unmapped_event' || existente?.status === 'skipped') {
    return false
  }

  if (existente?.status === 'processing' && existente.created_at) {
    const age = Date.now() - new Date(existente.created_at).getTime()
    if (age >= 0 && age < PROCESSING_LOCK_MS) {
      return false
    }
  }

  if (existente) {
    const { data: locked, error } = await supabase
      .from('log_webhooks')
      .update({
        status: 'processing',
        event_type: event.type,
        payload: event,
        erro_mensagem: null,
      })
      .eq('event_id', event.id)
      .in('status', ['failed', 'processing'])
      .select('id')
      .maybeSingle()
    if (error) throw error
    // Sem linha atualizada = outro worker já tomou o lock ou status mudou
    return Boolean(locked?.id)
  }

  const { error } = await supabase.from('log_webhooks').insert({
    event_id: event.id,
    event_type: event.type,
    payload: event,
    status: 'processing',
  })

  // Corrida: outro worker inseriu — reavalia
  if (error) {
    const { data: again } = await supabase
      .from('log_webhooks')
      .select('status')
      .eq('event_id', event.id)
      .maybeSingle()
    if (again?.status === 'processed' || again?.status === 'processing' || again?.status === 'ignored_unmapped_event' || again?.status === 'skipped') {
      return false
    }
    throw error
  }

  return true
}

async function handleCheckoutExpirado(supabase: any, session: Stripe.Checkout.Session) {
  const assinaturaId =
    session.client_reference_id ||
    session.metadata?.assinatura_id ||
    session.metadata?.id ||
    null

  if (!assinaturaId) {
    console.warn('checkout.session.expired sem assinatura_id')
    return
  }

  const { data, error } = await supabase
    .from('assinaturas')
    .update({
      plano_status: 'incomplete_expired',
      cancel_at_period_end: false,
      cancel_at: null,
    })
    .eq('id', assinaturaId)
    .eq('plano_status', 'incomplete')
    .select('id')

  if (error) throw error
  if (!data?.length) {
    console.log(`checkout.expired: nenhuma incomplete para ${assinaturaId}`)
  }
}

async function handleCheckoutSucesso(supabase: any, subId: string, internalId: string | null) {
  await aplicarPagamentoSucesso(supabase, subId, internalId)
}

async function handlePagamentoSucesso(supabase: any, subId: string, internalId: string | null) {
  await aplicarPagamentoSucesso(supabase, subId, internalId)
}

async function aplicarPagamentoSucesso(supabase: any, subId: string, internalId: string | null) {
  const subscription = await stripe.subscriptions.retrieve(subId)
  const priceId = subscription.items.data[0].price.id
  const planoTipo = await calcularPlanoTipo(supabase, priceId)

  const metaUserId = String(subscription.metadata?.user_id || '').trim()
  const metaEmail = String(subscription.metadata?.checkout_email || '').trim().toLowerCase()

  let customerEmail = metaEmail
  if (!customerEmail && subscription.customer) {
    try {
      const customer = await stripe.customers.retrieve(subscription.customer as string)
      if (customer && !('deleted' in customer && customer.deleted)) {
        customerEmail = String((customer as { email?: string }).email || '').trim().toLowerCase()
      }
    } catch {
      /* ignora */
    }
  }

  const updateData: Record<string, unknown> = {
    plano_status: normalizarStatusStripe(subscription.status) === 'trialing' ? 'trialing' : 'active',
    plano_tipo: planoTipo,
    stripe_subscription_id: subId,
    stripe_customer_id: subscription.customer as string,
    stripe_price_id: priceId,
    plano_regra_id: priceId,
    proxima_fatura: new Date(subscription.current_period_end * 1000).toISOString(),
    plano_fim_periodo: new Date(subscription.current_period_end * 1000).toISOString(),
    data_falha_pagamento: null,
    motivo_falha: null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
    stripe_latest_invoice_url: null,
    cortesia: false,
    cortesia_em: null,
    cortesia_motivo: null,
    encerrar_conta_agendado: false,
  }

  if (customerEmail) {
    updateData.checkout_email = customerEmail
  }

  if (internalId) {
    updateData.id = internalId
    const { data, error } = await supabase
      .from('assinaturas')
      .upsert(updateData, { onConflict: 'id' })
      .select('id')
    if (error) throw error
    if (!data?.length) throw new Error(`Pagamento ok sem upsert: sub=${subId} id=${internalId}`)
  } else {
    const { data, error } = await supabase
      .from('assinaturas')
      .update(updateData)
      .eq('stripe_subscription_id', subId)
      .select('id')
    if (error) throw error
    if (!data?.length) {
      throw new Error(`Pagamento ok sem linha vinculada: sub=${subId}. Verifique metadata.assinatura_id.`)
    }
  }

  const finalId = internalId || await buscarIdPorSubId(supabase, subId)
  if (finalId) {
    await supabase.from('usuarios').update({ status: true }).eq('assinatura_id', finalId)

    // Amarras dono no pagamento quando metadata.user_id é confiável (upgrade autenticado)
    if (metaUserId && /^[0-9a-f-]{36}$/i.test(metaUserId)) {
      await supabase
        .from('assinaturas')
        .update({ proprietario_id: metaUserId })
        .eq('id', finalId)
        .is('proprietario_id', null)
    }
  }
}

async function handleFalhaPagamento(
  supabase: any,
  subId: string,
  internalId: string | null,
  session: any,
) {
  const dataFalha = session.created
    ? new Date(session.created * 1000).toISOString()
    : new Date().toISOString()

  const fimPeriodo = session.lines?.data?.[0]?.period?.end
    ? new Date(session.lines.data[0].period.end * 1000).toISOString()
    : undefined

  const invoiceUrl = session?.hosted_invoice_url || null
  const motivo = session?.last_payment_error?.message || 'Pagamento recusado pelo banco emissor.'

  const payload: Record<string, unknown> = {
    plano_status: 'past_due',
    data_falha_pagamento: dataFalha,
    stripe_latest_invoice_url: invoiceUrl,
    motivo_falha: motivo,
    stripe_subscription_id: subId,
  }

  if (fimPeriodo) payload.plano_fim_periodo = fimPeriodo

  const finalId = internalId || await buscarIdPorSubId(supabase, subId)
  let data: any[] | null = null
  let error: any = null

  if (finalId) {
    ;({ data, error } = await supabase
      .from('assinaturas')
      .update(payload)
      .eq('id', finalId)
      .select('id'))
  } else {
    ;({ data, error } = await supabase
      .from('assinaturas')
      .update(payload)
      .eq('stripe_subscription_id', subId)
      .select('id'))
  }

  if (error) throw error
  if (!data?.length) {
    throw new Error(`payment_failed sem assinatura vinculada: sub=${subId}`)
  }
}

async function handleAtualizacao(supabase: any, subId: string, internalId: string | null) {
  const subscription = await stripe.subscriptions.retrieve(subId)
  const finalId = internalId || await buscarIdPorSubId(supabase, subId)
  if (!finalId) throw new Error(`Assinatura interna não encontrada para subId: ${subId}`)

  const { data: assAtual } = await supabase
    .from('assinaturas')
    .select('cortesia')
    .eq('id', finalId)
    .maybeSingle()

  const encerrarCortesia = assAtual?.cortesia
    ? { cortesia: false, cortesia_em: null, cortesia_motivo: null }
    : {}

  const statusNorm = normalizarStatusStripe(subscription.status)
  const priceId = subscription.items.data[0]?.price?.id
  const planoTipo = priceId ? await calcularPlanoTipo(supabase, priceId) : undefined

  const basePeriodo = {
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
    plano_fim_periodo: new Date(subscription.current_period_end * 1000).toISOString(),
    proxima_fatura: new Date(subscription.current_period_end * 1000).toISOString(),
    ...encerrarCortesia,
  }

  if (statusNorm === 'trialing' && priceId) {
    const { data, error } = await supabase.from('assinaturas').update({
      plano_status: 'trialing',
      plano_tipo: planoTipo,
      plano_regra_id: priceId,
      stripe_price_id: priceId,
      ...basePeriodo,
    }).eq('id', finalId).select('id')
    if (error) throw error
    if (!data?.length) throw new Error(`trialing update 0 rows: ${finalId}`)
    await supabase.from('usuarios').update({ status: true }).eq('assinatura_id', finalId)
    return
  }

  if (statusNorm === 'paused') {
    const { data, error } = await supabase.from('assinaturas').update({
      plano_status: 'paused',
      cancel_at_period_end: subscription.cancel_at_period_end,
      ...encerrarCortesia,
    }).eq('id', finalId).select('id')
    if (error) throw error
    if (!data?.length) throw new Error(`paused update 0 rows: ${finalId}`)
    return
  }

  const updatePayload: Record<string, unknown> = {
    plano_status: statusNorm,
    ...basePeriodo,
  }
  if (priceId) {
    updatePayload.plano_tipo = planoTipo
    updatePayload.plano_regra_id = priceId
    updatePayload.stripe_price_id = priceId
  }

  const { data, error } = await supabase
    .from('assinaturas')
    .update(updatePayload)
    .eq('id', finalId)
    .select('id')

  if (error) throw error
  if (!data?.length) throw new Error(`subscription.updated 0 rows: ${finalId}`)

  const statusBloqueioImediato = ['unpaid', 'incomplete', 'incomplete_expired'].includes(statusNorm)
  if (statusBloqueioImediato) {
    await supabase.from('usuarios').update({ status: false }).eq('assinatura_id', finalId)
    await supabase
      .from('projetos')
      .update({ notificar_vencimentos_email: false })
      .eq('assinatura_id', finalId)
  } else if (statusNorm === 'active' || statusNorm === 'trialing') {
    await supabase.from('usuarios').update({ status: true }).eq('assinatura_id', finalId)
  }
}

async function handleCancelamento(
  supabase: any,
  subId: string,
  internalId: string | null,
  deletedSub: any,
) {
  const finalId = internalId || await buscarIdPorSubId(supabase, subId)
  if (!finalId) {
    throw new Error(`subscription.deleted sem assinatura: sub=${subId}`)
  }

  const { data: assAtual } = await supabase
    .from('assinaturas')
    .select('stripe_subscription_id, encerrar_conta_agendado, plano_status')
    .eq('id', finalId)
    .maybeSingle()

  // Downgrade já limpou o sub_id e gravou INICIANTE — não sobrescrever encerramento
  if (assAtual?.stripe_subscription_id && assAtual.stripe_subscription_id !== subId) {
    return
  }

  if (assAtual?.plano_status === 'canceled' && !assAtual?.stripe_subscription_id) {
    return
  }

  const motivoMeta = deletedSub?.metadata?.motivo_encerramento as string | undefined
  const encerrarConta =
    assAtual?.encerrar_conta_agendado === true ||
    motivoMeta === 'cancelar_conta'

  if (encerrarConta) {
    const { data, error } = await supabase.from('assinaturas').update({
      plano_status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      proxima_fatura: null,
      plano_fim_periodo: null,
      cancel_at_period_end: false,
      cancel_at: new Date().toISOString(),
      stripe_latest_invoice_url: null,
      data_falha_pagamento: null,
      motivo_falha: null,
      encerrar_conta_agendado: false,
      cortesia: false,
      cortesia_em: null,
      cortesia_motivo: null,
    }).eq('id', finalId).select('id')

    if (error) throw error
    if (!data?.length) throw new Error(`deleted→canceled 0 rows: ${finalId}`)
    await supabase.from('usuarios').update({ status: false }).eq('assinatura_id', finalId)
    await supabase
      .from('projetos')
      .update({ status: false, notificar_vencimentos_email: false })
      .eq('assinatura_id', finalId)
    return
  }

  // Cancelamento de plano pago / portal / downgrade → INICIANTE ativo
  const { data: planoIniciante } = await supabase
    .from('plano_regras')
    .select('stripe_price_id')
    .eq('nome_plano', 'INICIANTE')
    .maybeSingle()

  if (!planoIniciante?.stripe_price_id) {
    throw new Error('Plano INICIANTE não configurado em plano_regras.')
  }

  const { data, error } = await supabase.from('assinaturas').update({
    plano_tipo: 'INICIANTE',
    plano_status: 'active',
    plano_regra_id: planoIniciante.stripe_price_id,
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
  }).eq('id', finalId).select('id')

  if (error) throw error
  if (!data?.length) throw new Error(`deleted→INICIANTE 0 rows: ${finalId}`)
  await supabase.from('usuarios').update({ status: true }).eq('assinatura_id', finalId)
}

/** Extrai id de subscription de invoice/checkout/subscription (string ou objeto expandido). */
function extrairSubscriptionId(obj: any): string | null {
  if (!obj) return null
  if (obj.object === 'subscription' && typeof obj.id === 'string') return obj.id

  const raw = obj.subscription
  if (typeof raw === 'string' && raw.length > 0) return raw
  if (raw && typeof raw === 'object' && typeof raw.id === 'string') return raw.id

  // Alguns invoices trazem parent.subscription_details / lines
  const fromParent = obj.parent?.subscription_details?.subscription
  if (typeof fromParent === 'string') return fromParent
  if (fromParent && typeof fromParent === 'object' && typeof fromParent.id === 'string') {
    return fromParent.id
  }

  const fromLine = obj.lines?.data?.[0]?.parent?.subscription_item_details?.subscription
    || obj.lines?.data?.[0]?.subscription
  if (typeof fromLine === 'string') return fromLine

  return null
}

/** Status Stripe → valores aceitos pelo CHECK do banco. */
function normalizarStatusStripe(status: string): string {
  if (status === 'incomplete_expired') return 'incomplete_expired'
  const allowed = new Set([
    'active', 'past_due', 'unpaid', 'canceled', 'incomplete',
    'incomplete_expired', 'trialing', 'paused',
  ])
  if (allowed.has(status)) return status
  // Fallback conservador: bloqueia em vez de liberar
  console.warn(`Status Stripe não mapeado: ${status} → incomplete`)
  return 'incomplete'
}

function normalizarPlanoTipo(raw?: string | null): string {
  const t = (raw || '').trim().toUpperCase()
  if (!t) return 'INICIANTE'
  if (
    t === 'INICIANTE' ||
    t.includes('FREE') ||
    t.includes('GRAT') ||
    t.includes('BASICO') ||
    t.includes('BÁSICO')
  ) {
    return 'INICIANTE'
  }
  if (t === 'PRO' || t.startsWith('PRO ') || t.includes('PROFISSIONAL')) return 'PRO'
  if (t.includes('GESTOR')) return 'GESTOR'
  if (t.includes('DESENV') || t.includes('TESTE')) return 'DESENVOLVIMENTO'
  return 'INICIANTE'
}

async function calcularPlanoTipo(supabase: any, priceId: string): Promise<string> {
  const { data } = await supabase
    .from('plano_regras')
    .select('nome_plano')
    .eq('stripe_price_id', priceId)
    .maybeSingle()
  if (!data?.nome_plano) {
    console.warn(`Price sem plano_regras: ${priceId}`)
  }
  return normalizarPlanoTipo(data?.nome_plano)
}

async function obterIdInternoAssinatura(
  supabase: any,
  subId: string,
  session: any,
  eventType: string,
): Promise<string | null> {
  const localId = await buscarIdPorSubId(supabase, subId)
  if (localId) return localId

  const metadataId =
    session?.metadata?.assinatura_id ||
    session?.metadata?.id ||
    session?.client_reference_id ||
    session?.subscription_details?.metadata?.assinatura_id ||
    session?.parent?.subscription_details?.metadata?.assinatura_id ||
    null
  if (metadataId) return metadataId

  try {
    const subscription = await stripe.subscriptions.retrieve(subId)
    return subscription.metadata?.assinatura_id || subscription.metadata?.id || null
  } catch (err) {
    console.warn(`obterIdInternoAssinatura (${eventType}):`, err)
    return null
  }
}

async function buscarIdPorSubId(supabase: any, stripeSubId: string): Promise<string | null> {
  const { data } = await supabase
    .from('assinaturas')
    .select('id')
    .eq('stripe_subscription_id', stripeSubId)
    .maybeSingle()
  return data?.id || null
}

async function marcarStatusEvento(supabase: any, eventId: string, status: string, erroMensagem: string | null) {
  const payload: Record<string, unknown> = { status }
  if (erroMensagem) payload.erro_mensagem = erroMensagem
  else payload.erro_mensagem = null
  await supabase.from('log_webhooks').update(payload).eq('event_id', eventId)
}
