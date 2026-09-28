import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  criarSupabaseAdmin,
  obterUsuarioAutenticado,
  validarGestorAssinatura,
} from "../_shared/assinaturaAuth.ts"
import { EMPRESA_DEFAULT } from "../_shared/empresa.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function resolverSiteUrl(req: Request): string {
  const envUrl = Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('SITE_URL') || ''
  const origin = req.headers.get('origin') || ''
  const host = (() => {
    try {
      return origin ? new URL(origin).hostname : ''
    } catch {
      return ''
    }
  })()

  // Prefere domínio canônico em produção; origin só para localhost/preview.
  if (envUrl) return envUrl.replace(/\/$/, '')
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) {
    return origin.replace(/\/$/, '')
  }
  return (EMPRESA_DEFAULT.siteApp || 'http://localhost:5173').replace(/\/$/, '')
}

function mensagemJaRegistrado(err: { message?: string } | null): boolean {
  const msg = (err?.message || '').toLowerCase()
  return (
    msg.includes('already') ||
    msg.includes('registered') ||
    msg.includes('exists') ||
    msg.includes('já')
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = criarSupabaseAdmin()
    const authUser = await obterUsuarioAutenticado(req, supabaseAdmin)
    if (!authUser) throw new Error('Não autenticado.')

    const { email, nome, assinatura_id, projeto_ids, funcao } = await req.json()

    if (!email || !assinatura_id) {
      throw new Error('E-mail e assinatura_id são obrigatórios.')
    }

    const assinaturaMetadata = authUser.user_metadata?.assinatura_id
    if (assinaturaMetadata && assinaturaMetadata !== assinatura_id) {
      throw new Error('Assinatura informada não corresponde à sua conta.')
    }

    await validarGestorAssinatura(supabaseAdmin, assinatura_id, authUser.id)

    if (Array.isArray(projeto_ids) && projeto_ids.length > 0) {
      const { data: projetosValidos, error: projetosError } = await supabaseAdmin
        .from('projetos')
        .select('id')
        .eq('assinatura_id', assinatura_id)
        .eq('status', true)
        .in('id', projeto_ids)

      if (projetosError) throw projetosError
      if ((projetosValidos?.length ?? 0) !== projeto_ids.length) {
        throw new Error('Um ou mais projetos informados não pertencem à sua assinatura.')
      }
    }

    const emailNorm = String(email).trim().toLowerCase()
    const funcaoFinal = funcao === 'GESTOR' ? 'GESTOR' : 'COLABORADOR'
    const redirectTo = `${resolverSiteUrl(req)}/definir-senha`

    const { data: authUserInvite, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      emailNorm,
      {
        redirectTo,
        data: {
          nome_completo: nome,
          assinatura_id,
          projeto_ids,
          role: funcaoFinal,
          origem_cadastro: 'CONVIDADO',
        },
      }
    )

    if (authError) {
      if (mensagemJaRegistrado(authError)) {
        throw new Error(
          'Este e-mail já possui convite ou conta. Se o status estiver PENDENTE, use “Reenviar convite”.'
        )
      }
      throw authError
    }

    return new Response(JSON.stringify({ success: true, userId: authUserInvite.user?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
