import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { carregarEmpresa } from "../_shared/empresa.ts"
import {
  criarSupabaseAdmin,
  obterUsuarioAutenticado,
} from "../_shared/assinaturaAuth.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const THEME = {
  green: '#2563eb',
  greenDark: '#1d4ed8',
  text: '#1a2332',
  muted: '#5c6678',
  border: '#d8dce3',
  surface: '#f4f5f7',
  gray: '#5c6678',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatarDescricao(desc: string): string {
  return String(desc ?? '').trim().replace(/\s*\+\s*/g, ' — ') || '—'
}

function mensagemErroResend(data: Record<string, unknown>, status: number): string {
  const raw = String(data?.message ?? data?.error ?? '')
  const lower = raw.toLowerCase()

  if (
    lower.includes('only send testing emails') ||
    lower.includes('verify a domain') ||
    lower.includes('not verified')
  ) {
    return (
      'Não é possível enviar cotação a fornecedores ainda: o domínio do remetente não está verificado no Resend. ' +
      'Acesse resend.com/domains, verifique proativaweb.com.br (ou outro domínio seu) e use um e-mail desse domínio como remetente ' +
      '(ex.: ControleEPI.com <contato@proativaweb.com.br>). Enquanto isso, o Resend só permite teste para o e-mail da conta.'
    )
  }

  if (lower.includes('invalid from') || lower.includes('from address')) {
    return (
      'Remetente inválido no Resend. Verifique o domínio em resend.com/domains e configure PEDIDO_FROM_EMAIL ' +
      'como ControleEPI.com <contato@seudominio-verificado.com>.'
    )
  }

  return raw || `Falha no envio de e-mail (HTTP ${status}).`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada no servidor.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = criarSupabaseAdmin()
    const authUser = await obterUsuarioAutenticado(req, supabaseAdmin)
    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const {
      fornecedores,
      itens,
      usuario,
      projetoNome,
      observacoes,
      projetoId,
    } = body as {
      fornecedores?: Array<{ id?: string; email_contato?: string; nome_contato?: string; razao_social?: string }>
      itens?: Array<{ descricao_completa: string; quantidade: number }>
      usuario?: { nome_completo?: string; email?: string }
      projetoNome?: string
      observacoes?: string
      projetoId?: string
    }

    if (!projetoId) {
      return new Response(JSON.stringify({ error: 'projetoId é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Autorização: gestor ativo do projeto + assinatura não cancelada
    const { data: membro, error: membroErr } = await supabaseAdmin
      .from('membro_projetos')
      .select('id, funcao, projetos!inner(id, nome, status, assinaturas!inner(plano_status))')
      .eq('projeto_id', projetoId)
      .eq('usuario_id', authUser.id)
      .eq('status', true)
      .eq('funcao', 'GESTOR')
      .maybeSingle()

    if (membroErr || !membro) {
      return new Response(JSON.stringify({ error: 'Sem permissão de gestor neste projeto.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const projeto = (membro as {
      projetos?: { status?: boolean; nome?: string; assinaturas?: { plano_status?: string } }
    }).projetos

    if (projeto?.status === false || projeto?.assinaturas?.plano_status === 'canceled') {
      return new Response(JSON.stringify({ error: 'Projeto ou assinatura indisponível.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!Array.isArray(fornecedores) || fornecedores.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum fornecedor informado.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum item no pedido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const idsSolicitados = [
      ...new Set(
        fornecedores
          .map((f) => f.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      ),
    ]

    if (idsSolicitados.length === 0) {
      return new Response(JSON.stringify({ error: 'Fornecedores sem id — recarregue a lista e tente novamente.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // E-mails sempre do banco (nunca confiar no payload do cliente)
    const { data: fornecedoresDb, error: fornErr } = await supabaseAdmin
      .from('fornecedores')
      .select('id, email_contato, nome_contato, razao_social, status')
      .eq('projeto_id', projetoId)
      .in('id', idsSolicitados)

    if (fornErr) {
      return new Response(JSON.stringify({ error: `Falha ao carregar fornecedores: ${fornErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const destinatarios = (fornecedoresDb ?? [])
      .filter((f) => {
        const st = String(f.status ?? '1').trim().toLowerCase()
        return st !== '0' && st !== 'false' && st !== 'inativo'
      })
      .map((f) => ({
        email: String(f.email_contato ?? '').trim(),
        nomeContato:
          String(f.nome_contato ?? '').trim() ||
          String(f.razao_social ?? '').trim() ||
          'responsável',
      }))
      .filter((f) => Boolean(f.email) && f.email.includes('@'))

    if (destinatarios.length === 0) {
      return new Response(JSON.stringify({ error: 'Os fornecedores selecionados não possuem e-mail cadastrado.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const empresa = await carregarEmpresa()
    const fromEmail = Deno.env.get('PEDIDO_FROM_EMAIL') ?? empresa.emailRemetente
    const siteUrl = Deno.env.get('SITE_URL') || empresa.siteApp

    const nomeProjeto =
      String(projetoNome ?? '').trim() ||
      String(projeto?.nome ?? '').trim() ||
      'Projeto'
    const nomeUsuario = String(usuario?.nome_completo ?? '').trim() || 'Usuário'
    // Reply-to: e-mail do usuário autenticado (não do payload)
    const emailUsuario = (authUser.email ?? String(usuario?.email ?? '')).trim()

    const linhasTabela = itens.map((i) => `
      <tr>
        <td style="border:1px solid ${THEME.border}; padding:12px 14px; color:${THEME.text}; font-size:14px;">${escHtml(formatarDescricao(i.descricao_completa))}</td>
        <td style="border:1px solid ${THEME.border}; padding:12px 14px; text-align:center; font-weight:600; color:${THEME.text};">${Number(i.quantidade) || 0}</td>
        <td style="border:1px solid ${THEME.border}; padding:12px 14px; background:#fffbeb; width:110px; color:${THEME.muted};">R$ ______</td>
        <td style="border:1px solid ${THEME.border}; padding:12px 14px; background:#fffbeb; width:110px; color:${THEME.muted};">R$ ______</td>
      </tr>
    `).join('')

    const blocoObservacoes = observacoes
      ? `
        <div style="margin:24px 0; padding:16px 18px; border-left:4px solid ${THEME.green}; background:${THEME.surface}; border-radius:0 6px 6px 0;">
          <strong style="color:${THEME.text}; font-size:13px; text-transform:uppercase; letter-spacing:0.04em;">Observações do solicitante</strong>
          <p style="margin:10px 0 0; color:${THEME.muted}; font-size:14px; line-height:1.55; white-space:pre-wrap;">${escHtml(observacoes)}</p>
        </div>
      `
      : ''

    const montarHtml = (nomeContato: string) => `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <body style="margin:0; padding:0; background:#eef1f5; font-family:'Segoe UI', Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5; padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px; background:#ffffff; border-radius:8px; overflow:hidden; border:1px solid ${THEME.border}; box-shadow:0 4px 24px rgba(26,35,50,0.06);">
                <tr>
                  <td style="padding:22px 28px; border-bottom:2px solid ${THEME.green}; background:#ffffff;">
                    <h1 style="margin:0 0 6px; font-size:18px; font-weight:700; color:${THEME.text}; letter-spacing:0.02em; line-height:1.25;">
                      Solicitação de Orçamento de EPI
                    </h1>
                    <p style="margin:0; font-size:13px; color:${THEME.muted}; line-height:1.45;">
                      <strong style="color:${THEME.text};">${escHtml(nomeProjeto)}</strong>
                      <span style="color:${THEME.border};"> · </span>
                      ${escHtml(nomeUsuario)}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:${THEME.text};">
                      Olá, ${escHtml(nomeContato)}.
                    </p>
                    <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${THEME.muted};">
                      Solicitamos cotação de preços para os Equipamentos de Proteção Individual (EPI) listados abaixo.
                      Por favor, preencha os valores unitários e subtotais nas colunas indicadas e informe prazo de entrega.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:20px 0;">
                      <thead>
                        <tr style="background:${THEME.gray};">
                          <th style="border:1px solid ${THEME.gray}; padding:12px 14px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:#fff;">EPI (descrição — guia/tamanho)</th>
                          <th style="border:1px solid ${THEME.gray}; padding:12px 14px; font-size:11px; font-weight:600; text-transform:uppercase; color:#fff;">Qtd.</th>
                          <th style="border:1px solid ${THEME.gray}; padding:12px 14px; font-size:11px; font-weight:600; text-transform:uppercase; color:#fff;">Vlr. unit.</th>
                          <th style="border:1px solid ${THEME.gray}; padding:12px 14px; font-size:11px; font-weight:600; text-transform:uppercase; color:#fff;">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${linhasTabela}
                      </tbody>
                    </table>

                    ${blocoObservacoes}

                    <div style="margin:24px 0; padding:20px 22px; border:1px dashed ${THEME.green}; border-radius:6px; background:rgba(37, 99, 235,0.06);">
                      <p style="margin:0 0 12px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:${THEME.text};">Dados da proposta (preenchimento do fornecedor)</p>
                      <p style="margin:0 0 8px; font-size:14px; color:${THEME.text};">Prazo de entrega / envio: ________________________________</p>
                      <p style="margin:0 0 8px; font-size:14px; color:${THEME.text};">Validade da proposta: ________________________________</p>
                      <p style="margin:16px 0 0; font-size:16px; font-weight:700; color:${THEME.greenDark};">Valor total do pedido: R$ ________________________________</p>
                    </div>

                    <p style="margin:24px 0 0; font-size:14px; line-height:1.6; color:${THEME.muted};">
                      Responda este e-mail diretamente para o solicitante:
                      <strong style="color:${THEME.text};">${escHtml(nomeUsuario)}</strong>
                      ${emailUsuario
                        ? `(<a href="mailto:${escHtml(emailUsuario)}" style="color:${THEME.greenDark}; text-decoration:none;">${escHtml(emailUsuario)}</a>).`
                        : ''}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px 28px; border-top:1px dashed ${THEME.border}; text-align:center;">
                    <img src="${empresa.logoUrl}" alt="${escHtml(empresa.nome)}" width="120" style="display:inline-block; max-width:120px; height:auto; border:0; margin:0 0 12px;" />
                    <p style="margin:0 0 6px; font-size:12px; color:${THEME.muted};">
                      Enviado via <strong style="color:${THEME.greenDark};">${escHtml(empresa.nome)}</strong> — ${escHtml(empresa.slogan)}
                    </p>
                    <p style="margin:0 0 4px; font-size:11px; color:#9aa3b2;">
                      <a href="${siteUrl}" style="color:${THEME.greenDark}; text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a>
                      · ${escHtml(empresa.razaoSocial)} · CNPJ ${escHtml(empresa.cnpj)}
                    </p>
                    <p style="margin:0; font-size:11px; color:#9aa3b2;">
                      <a href="mailto:${escHtml(empresa.emailSuporte)}" style="color:${THEME.greenDark}; text-decoration:none;">${escHtml(empresa.emailSuporte)}</a>
                      · ${escHtml(empresa.telefone)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    const resultados: unknown[] = []
    for (const dest of destinatarios) {
      const subject = `[ORÇAMENTO EPI´S] A/C de '${dest.nomeContato}'`
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [dest.email],
          reply_to: emailUsuario || undefined,
          subject,
          html: montarHtml(dest.nomeContato),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        const msg = mensagemErroResend(data, response.status)
        console.error('Resend error:', data)
        return new Response(JSON.stringify({ error: msg, details: data }), {
          status: response.status >= 400 && response.status < 600 ? response.status : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      resultados.push(data)
    }

    return new Response(JSON.stringify({ success: true, enviados: resultados.length, results: resultados }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
