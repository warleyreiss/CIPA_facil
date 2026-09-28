import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export function criarSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Variáveis Supabase ausentes.')
  return createClient(url, key)
}

export async function obterUsuarioAutenticado(
  req: Request,
  supabaseAdmin: SupabaseClient
) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function validarGestorAssinatura(
  supabaseAdmin: SupabaseClient,
  assinaturaId: string,
  userId: string
) {
  const { data, error } = await supabaseAdmin
    .from('membro_projetos')
    .select('id')
    .eq('assinatura_id', assinaturaId)
    .eq('usuario_id', userId)
    .eq('funcao', 'GESTOR')
    .eq('status', true)
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Sem permissão: apenas gestores podem executar esta ação.')
  }
}

export async function validarProprietarioAssinatura(
  supabaseAdmin: SupabaseClient,
  assinaturaId: string,
  userId: string
) {
  const { data: assinatura, error } = await supabaseAdmin
    .from('assinaturas')
    .select('id, proprietario_id, plano_status, stripe_subscription_id, stripe_customer_id')
    .eq('id', assinaturaId)
    .single()

  if (error || !assinatura) {
    throw new Error('Assinatura não encontrada.')
  }

  if (assinatura.proprietario_id !== userId) {
    throw new Error('Sem permissão para alterar esta assinatura.')
  }

  return assinatura
}

/** Cadastro pré-login: assinatura incomplete sem dono. */
export async function validarAssinaturaSignup(
  supabaseAdmin: SupabaseClient,
  assinaturaId: string
) {
  const { data: assinatura, error } = await supabaseAdmin
    .from('assinaturas')
    .select('id, proprietario_id, plano_status, stripe_customer_id')
    .eq('id', assinaturaId)
    .single()

  if (error || !assinatura) {
    throw new Error('Assinatura não encontrada.')
  }

  if (assinatura.proprietario_id) {
    throw new Error('Assinatura já vinculada a um usuário.')
  }

  if (assinatura.plano_status !== 'incomplete') {
    throw new Error('Assinatura não está disponível para checkout inicial.')
  }

  return assinatura
}

export async function validarLimitesPlanoAlvo(
  supabaseAdmin: SupabaseClient,
  assinaturaId: string,
  stripePriceId: string
) {
  const { data, error } = await supabaseAdmin.rpc('fn_validar_limites_plano_alvo', {
    p_assinatura_id: assinaturaId,
    p_stripe_price_id: stripePriceId,
  })

  if (error) throw new Error(`Falha na validação de limites: ${error.message}`)
  if (data !== true) {
    throw new Error('Uso atual excede os limites do plano selecionado. Ajuste projetos, colaboradores ou EPIs antes de continuar.')
  }
}

export async function obterPriceIdPlanoIniciante(supabaseAdmin: SupabaseClient): Promise<string> {
  const { data } = await supabaseAdmin
    .from('plano_regras')
    .select('stripe_price_id')
    .eq('nome_plano', 'INICIANTE')
    .maybeSingle()

  if (!data?.stripe_price_id) {
    throw new Error('Plano INICIANTE não configurado em plano_regras.')
  }

  return data.stripe_price_id
}

/**
 * Garante que o priceId existe em plano_regras comercial (exclui DESENV/TESTE/INTERNO).
 */
export async function validarPriceIdComercial(
  supabaseAdmin: SupabaseClient,
  priceId: string
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('plano_regras')
    .select('stripe_price_id, nome_plano')
    .eq('stripe_price_id', priceId)
    .maybeSingle()

  if (error) throw new Error(`Falha ao validar preço: ${error.message}`)
  if (!data?.stripe_price_id) {
    throw new Error('priceId inválido: plano não cadastrado.')
  }

  const nome = (data.nome_plano ?? '').toUpperCase()
  if (
    nome.includes('DESENV') ||
    nome.includes('TESTE') ||
    nome.includes('INTERNO')
  ) {
    throw new Error('priceId inválido: plano interno não disponível para checkout.')
  }
}
