import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  criarSupabaseAdmin,
  obterUsuarioAutenticado,
} from '../_shared/assinaturaAuth.ts'
import {
  enviarWhatsAppWebhook,
  normalizarTelefoneE164Digits,
  telefoneWhatsAppFormatoOk,
} from '../_shared/whatsapp.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const OTP_TTL_MS = 10 * 60 * 1000
const OTP_COOLDOWN_MS = 60 * 1000
const OTP_MAX_ENVIOS_15MIN = 3
const OTP_MAX_TENTATIVAS = 5

type Acao = 'enviar_otp' | 'confirmar_otp' | 'status'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function gerarCodigo6(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(n).padStart(6, '0')
}

async function hashCodigo(codigo: string, projetoId: string, telefone: string): Promise<string> {
  const payload = `${codigo}:${projetoId}:${telefone}`
  const data = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function usuarioPodeGerirProjeto(
  supabase: ReturnType<typeof criarSupabaseAdmin>,
  userId: string,
  projetoId: string,
): Promise<{ ok: true; assinaturaId: string } | { ok: false; erro: string }> {
  const { data: projeto, error } = await supabase
    .from('projetos')
    .select('id, assinatura_id, status')
    .eq('id', projetoId)
    .maybeSingle()

  if (error || !projeto?.assinatura_id || projeto.status === false) {
    return { ok: false, erro: 'Projeto não encontrado.' }
  }

  const { data: membro } = await supabase
    .from('membro_projetos')
    .select('id')
    .eq('projeto_id', projetoId)
    .eq('usuario_id', userId)
    .eq('funcao', 'GESTOR')
    .eq('status', true)
    .limit(1)
    .maybeSingle()

  if (!membro) {
    return { ok: false, erro: 'Sem permissão: apenas gestores podem verificar o WhatsApp.' }
  }

  return { ok: true, assinaturaId: projeto.assinatura_id as string }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = criarSupabaseAdmin()
    const user = await obterUsuarioAutenticado(req, supabase)
    if (!user) return json({ ok: false, error: 'Não autenticado.' }, 401)

    const body = await req.json().catch(() => ({}))
    const acao = String(body?.acao || '') as Acao
    const projetoId = String(body?.projeto_id || '')

    if (!projetoId) return json({ ok: false, error: 'projeto_id obrigatório.' }, 400)

    const perm = await usuarioPodeGerirProjeto(supabase, user.id, projetoId)
    if (!perm.ok) return json({ ok: false, error: perm.erro }, 403)

    if (acao === 'status') {
      const { data: proj } = await supabase
        .from('projetos')
        .select('telefone_whatsapp_notificacao, telefone_whatsapp_verificado_em, notificar_vencimentos_whatsapp')
        .eq('id', projetoId)
        .maybeSingle()

      const telefone = proj?.telefone_whatsapp_notificacao
        ? normalizarTelefoneE164Digits(proj.telefone_whatsapp_notificacao)
        : null
      const verificadoEm = proj?.telefone_whatsapp_verificado_em ?? null

      return json({
        ok: true,
        telefone,
        verificado: !!verificadoEm && !!telefone,
        verificado_em: verificadoEm,
        notificar: !!proj?.notificar_vencimentos_whatsapp,
        mock_disponivel:
          (Deno.env.get('WHATSAPP_OTP_MOCK') || '').toLowerCase() === 'true' ||
          !Deno.env.get('WHATSAPP_WEBHOOK_URL'),
      })
    }

    if (acao === 'enviar_otp') {
      const telefoneRaw = String(body?.telefone || '')
      if (!telefoneWhatsAppFormatoOk(telefoneRaw)) {
        return json({
          ok: false,
          error: 'Telefone inválido. Use DDI + DDD + número (ex.: +55 11 99999-8888).',
        }, 400)
      }
      const telefone = normalizarTelefoneE164Digits(telefoneRaw)

      const desde = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { count: enviosRecentes } = await supabase
        .from('whatsapp_otp_desafios')
        .select('id', { count: 'exact', head: true })
        .eq('projeto_id', projetoId)
        .gte('created_at', desde)

      if ((enviosRecentes ?? 0) >= OTP_MAX_ENVIOS_15MIN) {
        return json({
          ok: false,
          error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
        }, 429)
      }

      const { data: ultimo } = await supabase
        .from('whatsapp_otp_desafios')
        .select('created_at')
        .eq('projeto_id', projetoId)
        .eq('telefone', telefone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (ultimo?.created_at) {
        const elapsed = Date.now() - new Date(ultimo.created_at).getTime()
        if (elapsed < OTP_COOLDOWN_MS) {
          return json({
            ok: false,
            error: `Aguarde ${Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000)}s para reenviar.`,
            retry_after_sec: Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000),
          }, 429)
        }
      }

      const codigo = gerarCodigo6()
      const codigo_hash = await hashCodigo(codigo, projetoId, telefone)
      const expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString()

      const { error: insertErr } = await supabase.from('whatsapp_otp_desafios').insert({
        projeto_id: projetoId,
        usuario_id: user.id,
        telefone,
        codigo_hash,
        expires_at,
      })
      if (insertErr) throw insertErr

      // Invalida verificação anterior se o número mudou / novo desafio
      await supabase
        .from('projetos')
        .update({
          telefone_whatsapp_notificacao: telefone,
          telefone_whatsapp_verificado_em: null,
        })
        .eq('id', projetoId)

      const mensagem =
        `*Controle EPI* — código de verificação\n\n` +
        `Seu código: *${codigo}*\n` +
        `Válido por 10 minutos.\n\n` +
        `Se você não solicitou, ignore esta mensagem.`

      const envio = await enviarWhatsAppWebhook(telefone, mensagem)
      if (!envio.ok) {
        return json({
          ok: false,
          error: 'Falha ao enviar WhatsApp. Verifique o provedor (WHATSAPP_WEBHOOK_URL).',
          detalhe: envio.detalhe,
        }, 502)
      }

      return json({
        ok: true,
        mock: envio.mock,
        expires_at,
        // Só em mock: permite testar sem parceiro
        ...(envio.mock ? { codigo_mock: codigo } : {}),
        mensagem: envio.mock
          ? 'Modo mock: código retornado na resposta (sem parceiro configurado).'
          : 'Código enviado por WhatsApp.',
      })
    }

    if (acao === 'confirmar_otp') {
      const telefoneRaw = String(body?.telefone || '')
      const codigo = String(body?.codigo || '').replace(/\D/g, '')
      if (!telefoneWhatsAppFormatoOk(telefoneRaw) || codigo.length !== 6) {
        return json({ ok: false, error: 'Informe telefone e código de 6 dígitos.' }, 400)
      }
      const telefone = normalizarTelefoneE164Digits(telefoneRaw)

      const { data: desafio, error: desafioErr } = await supabase
        .from('whatsapp_otp_desafios')
        .select('id, codigo_hash, expires_at, tentativas, consumido_em')
        .eq('projeto_id', projetoId)
        .eq('telefone', telefone)
        .is('consumido_em', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (desafioErr) throw desafioErr
      if (!desafio) {
        return json({ ok: false, error: 'Nenhum código pendente. Solicite um novo.' }, 400)
      }
      if (desafio.consumido_em) {
        return json({ ok: false, error: 'Código já utilizado. Solicite um novo.' }, 400)
      }
      if (new Date(desafio.expires_at).getTime() < Date.now()) {
        return json({ ok: false, error: 'Código expirado. Solicite um novo.' }, 400)
      }
      if ((desafio.tentativas ?? 0) >= OTP_MAX_TENTATIVAS) {
        return json({ ok: false, error: 'Tentativas esgotadas. Solicite um novo código.' }, 429)
      }

      const esperado = await hashCodigo(codigo, projetoId, telefone)
      if (esperado !== desafio.codigo_hash) {
        await supabase
          .from('whatsapp_otp_desafios')
          .update({ tentativas: (desafio.tentativas ?? 0) + 1 })
          .eq('id', desafio.id)
        return json({ ok: false, error: 'Código incorreto.' }, 400)
      }

      const agora = new Date().toISOString()
      await supabase
        .from('whatsapp_otp_desafios')
        .update({ consumido_em: agora })
        .eq('id', desafio.id)

      const { error: updErr } = await supabase
        .from('projetos')
        .update({
          telefone_whatsapp_notificacao: telefone,
          telefone_whatsapp_verificado_em: agora,
          notificar_vencimentos_whatsapp: true,
        })
        .eq('id', projetoId)

      if (updErr) throw updErr

      return json({
        ok: true,
        verificado_em: agora,
        telefone,
        mensagem: 'WhatsApp verificado. Alertas semanais liberados.',
      })
    }

    return json({ ok: false, error: 'Ação inválida. Use enviar_otp | confirmar_otp | status.' }, 400)
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 500)
  }
})
