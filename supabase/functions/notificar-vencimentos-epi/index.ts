import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { carregarEmpresa, type EmpresaConfig } from '../_shared/empresa.ts'
import { enviarWhatsAppWebhook, normalizarTelefoneE164Digits } from '../_shared/whatsapp.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

interface VencimentoRow {
  projeto_id: string
  projeto_nome: string
  notificar_vencimentos_email: boolean
  notificar_vencimentos_whatsapp: boolean
  telefone_whatsapp_notificacao: string | null
  dias_iminencia_troca?: number | null
  colaborador_nome: string
  epi_nome: string
  tamanho_desc: string | null
  status_prazo: string
  prazo_previsto: string | null
  prazo_restante_dias: number | null
}

function escHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function montarTextoResumo(
  projetoNome: string,
  vencidos: VencimentoRow[],
  iminentes: VencimentoRow[],
  empresa: EmpresaConfig,
): string {
  const linhas: string[] = [`*Resumo semanal — ${projetoNome}*`, '']
  if (vencidos.length) {
    linhas.push(`*Vencidos (${vencidos.length}):*`)
    vencidos.slice(0, 15).forEach((r) => {
      linhas.push(`• ${r.colaborador_nome} — ${r.epi_nome}${r.tamanho_desc ? ` (${r.tamanho_desc})` : ''}`)
    })
    if (vencidos.length > 15) linhas.push(`… e mais ${vencidos.length - 15}`)
    linhas.push('')
  }
  if (iminentes.length) {
    linhas.push(`*Iminentes (${iminentes.length}):*`)
    iminentes.slice(0, 15).forEach((r) => {
      const dias = r.prazo_restante_dias ?? '?'
      linhas.push(`• ${r.colaborador_nome} — ${r.epi_nome} (${dias} dia(s))`)
    })
    if (iminentes.length > 15) linhas.push(`… e mais ${iminentes.length - 15}`)
  }
  if (!vencidos.length && !iminentes.length) {
    linhas.push('Nenhum EPI vencido ou iminente nesta semana.')
  }
  linhas.push('', `${empresa.nome} — ${empresa.slogan}`, empresa.siteApp)
  return linhas.join('\n')
}

function montarHtmlEmail(
  projetoNome: string,
  vencidos: VencimentoRow[],
  iminentes: VencimentoRow[],
  empresa: EmpresaConfig,
  diasIminencia = 3,
): string {
  const linha = (r: VencimentoRow) =>
    `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${escHtml(r.colaborador_nome)}</td>` +
    `<td style="padding:8px;border:1px solid #e5e7eb;">${escHtml(r.epi_nome)}</td>` +
    `<td style="padding:8px;border:1px solid #e5e7eb;">${escHtml(r.status_prazo)}</td></tr>`

  const bloco = (titulo: string, lista: VencimentoRow[]) =>
    lista.length
      ? `<h3 style="color:#b91c1c;margin:20px 0 8px;">${titulo} (${lista.length})</h3>` +
        `<table style="width:100%;border-collapse:collapse;font-size:14px;">` +
        `<thead><tr style="background:#f8fafc;">` +
        `<th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Colaborador</th>` +
        `<th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">EPI</th>` +
        `<th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Status</th></tr></thead>` +
        `<tbody>${lista.map(linha).join('')}</tbody></table>`
      : ''

  const site = (empresa.siteApp || empresa.website).replace(/\/$/, '')

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <body style="margin:0;padding:0;background:#eef1f5;font-family:Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #d8dce3;">
              <tr>
                <td style="padding:22px 28px;border-bottom:2px solid #2563eb;text-align:center;">
                  <img src="${empresa.logoUrl}" alt="${escHtml(empresa.nome)}" width="140" style="display:inline-block;max-width:140px;height:auto;border:0;margin:0 0 10px;" />
                  <h2 style="margin:0;color:#0f172a;font-size:18px;">Alertas de EPI — ${escHtml(projetoNome)}</h2>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 28px;">
                  <p style="color:#475569;margin:0 0 16px;">Resumo semanal de equipamentos <strong>vencidos</strong> e com troca <strong>iminente</strong>.</p>
                  ${bloco('Vencidos', vencidos)}
                  ${bloco(`Iminentes (até ${diasIminencia} dias)`, iminentes)}
                  ${!vencidos.length && !iminentes.length ? '<p>Nenhum alerta nesta semana.</p>' : ''}
                </td>
              </tr>
              <tr>
                <td style="padding:20px 28px 28px;border-top:1px dashed #d8dce3;text-align:center;">
                  <p style="margin:0 0 4px;font-size:12px;color:#5c6678;">
                    <strong style="color:#1d4ed8;">${escHtml(empresa.nome)}</strong> — ${escHtml(empresa.slogan)}
                  </p>
                  <p style="margin:0;font-size:11px;color:#9aa3b2;">
                    <a href="${site}" style="color:#1d4ed8;text-decoration:none;">${site.replace(/^https?:\/\//, '')}</a>
                    · <a href="mailto:${escHtml(empresa.emailSuporte)}" style="color:#1d4ed8;text-decoration:none;">${escHtml(empresa.emailSuporte)}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`
}

async function enviarEmail(
  fromEmail: string,
  destinatarios: string[],
  assunto: string,
  html: string,
) {
  if (!RESEND_API_KEY || !destinatarios.length) {
    return { ok: false, detalhe: 'Resend não configurado ou sem destinatários' }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: fromEmail, to: destinatarios, subject: assunto, html }),
  })
  const data = await res.json()
  return { ok: res.ok, detalhe: JSON.stringify(data) }
}

async function enviarWhatsApp(telefone: string, texto: string) {
  return enviarWhatsAppWebhook(telefone, texto)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  const authHeader = req.headers.get('x-cron-secret')
  // Fail-closed: sem secret configurado ou header divergente → 401
  if (!cronSecret || authHeader !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const empresa = await carregarEmpresa()
    const fromEmail = Deno.env.get('NOTIFICACAO_FROM_EMAIL') ?? empresa.emailRemetente
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: rows, error } = await supabase
      .from('v_vencimentos_notificacao')
      .select('*')

    if (error) throw error

    // Filtra projetos ativos cuja assinatura não está cancelada
    const projetoIds = [...new Set((rows ?? []).map((r: VencimentoRow) => r.projeto_id))]
    let idsPermitidos = new Set<string>()
    if (projetoIds.length > 0) {
      const { data: projetosRows } = await supabase
        .from('projetos')
        .select('id, assinatura_id, status')
        .in('id', projetoIds)
        .eq('status', true)

      const assinaturaIds = [
        ...new Set((projetosRows ?? []).map((p: { assinatura_id: string }) => p.assinatura_id).filter(Boolean)),
      ]
      const { data: assinaturasOk } = assinaturaIds.length
        ? await supabase
            .from('assinaturas')
            .select('id, plano_status')
            .in('id', assinaturaIds)
            .neq('plano_status', 'canceled')
        : { data: [] as Array<{ id: string }> }

      const assinaturasPermitidas = new Set((assinaturasOk ?? []).map((a: { id: string }) => a.id))
      idsPermitidos = new Set(
        (projetosRows ?? [])
          .filter((p: { assinatura_id: string }) => assinaturasPermitidas.has(p.assinatura_id))
          .map((p: { id: string }) => p.id)
      )
    }

    const porProjeto = new Map<string, VencimentoRow[]>()
    for (const r of (rows ?? []) as VencimentoRow[]) {
      if (!idsPermitidos.has(r.projeto_id)) continue
      const lista = porProjeto.get(r.projeto_id) ?? []
      lista.push(r)
      porProjeto.set(r.projeto_id, lista)
    }

    const resultados: Array<Record<string, unknown>> = []

    for (const [projetoId, lista] of porProjeto) {
      const primeiro = lista[0]
      const vencidos = lista.filter((r) => r.status_prazo === 'VENCIDO')
      const iminentes = lista.filter((r) => r.status_prazo === 'IMINENTE')
      const projetoNome = primeiro.projeto_nome ?? 'Projeto'
      const diasIminenciaRaw = Number(primeiro.dias_iminencia_troca)
      const diasIminencia =
        Number.isFinite(diasIminenciaRaw) && diasIminenciaRaw >= 1 ? Math.floor(diasIminenciaRaw) : 3

      if (primeiro.notificar_vencimentos_email) {
        const { data: membros } = await supabase
          .from('membro_projetos')
          .select('usuarios(email, nome_completo, status)')
          .eq('projeto_id', projetoId)
          .eq('status', true)
          .eq('funcao', 'GESTOR')

        const emails = [
          ...new Set(
            (membros ?? [])
              .map((m: { usuarios?: { email?: string; status?: boolean } }) =>
                m.usuarios?.status === false ? null : m.usuarios?.email
              )
              .filter((e): e is string => !!e && e.includes('@'))
          ),
        ]

        const emailRes = await enviarEmail(
          fromEmail,
          emails,
          `[${empresa.nome}] Resumo semanal de EPI — ${projetoNome}`,
          montarHtmlEmail(projetoNome, vencidos, iminentes, empresa, diasIminencia),
        )

        await supabase.from('notificacoes_vencimentos_log').insert({
          projeto_id: projetoId,
          canal: 'EMAIL',
          destinatario: emails.join(', '),
          total_vencidos: vencidos.length,
          total_iminentes: iminentes.length,
          status: emailRes.ok ? 'ENVIADO' : 'FALHA',
          detalhe: emailRes.detalhe,
        })

        resultados.push({ projetoId, canal: 'EMAIL', ok: emailRes.ok, destinatarios: emails.length })
      }

      if (primeiro.notificar_vencimentos_whatsapp && primeiro.telefone_whatsapp_notificacao) {
        const telefoneNormalizado = normalizarTelefoneE164Digits(primeiro.telefone_whatsapp_notificacao)
        if (!telefoneNormalizado) {
          resultados.push({ projetoId, canal: 'WHATSAPP', ok: false, detalhe: 'telefone inválido' })
          continue
        }

        const texto = montarTextoResumo(projetoNome, vencidos, iminentes, empresa)
        const waRes = await enviarWhatsApp(telefoneNormalizado, texto)

        await supabase.from('notificacoes_vencimentos_log').insert({
          projeto_id: projetoId,
          canal: 'WHATSAPP',
          destinatario: telefoneNormalizado,
          total_vencidos: vencidos.length,
          total_iminentes: iminentes.length,
          status: waRes.ok ? 'ENVIADO' : 'FALHA',
          detalhe: waRes.detalhe,
        })

        resultados.push({ projetoId, canal: 'WHATSAPP', ok: waRes.ok, mock: waRes.mock })
      }
    }

    return new Response(JSON.stringify({ ok: true, projetos: resultados.length, resultados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
