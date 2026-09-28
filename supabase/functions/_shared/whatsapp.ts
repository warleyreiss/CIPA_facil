/** Envio genérico de WhatsApp via webhook (parceiro configurável). */

export function normalizarTelefoneE164Digits(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length >= 12) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

export function telefoneWhatsAppFormatoOk(raw: string): boolean {
  const n = normalizarTelefoneE164Digits(raw)
  return n.length >= 12 && n.length <= 15
}

export type EnvioWhatsAppResultado = {
  ok: boolean
  detalhe: string
  mock: boolean
}

/**
 * POST { phone, message } em WHATSAPP_WEBHOOK_URL.
 * Sem URL (ou WHATSAPP_OTP_MOCK=true): modo mock — não envia, ok=true.
 */
export async function enviarWhatsAppWebhook(
  telefone: string,
  texto: string,
): Promise<EnvioWhatsAppResultado> {
  const phone = normalizarTelefoneE164Digits(telefone)
  const mockEnv = (Deno.env.get('WHATSAPP_OTP_MOCK') || '').toLowerCase() === 'true'
  const webhook = Deno.env.get('WHATSAPP_WEBHOOK_URL') || ''

  if (!phone) {
    return { ok: false, detalhe: 'Telefone vazio', mock: false }
  }

  if (mockEnv || !webhook) {
    return {
      ok: true,
      detalhe: mockEnv
        ? 'Mock forçado (WHATSAPP_OTP_MOCK=true)'
        : 'Mock: WHATSAPP_WEBHOOK_URL não configurada',
      mock: true,
    }
  }

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message: texto }),
  })
  const detalhe = await res.text()
  return { ok: res.ok, detalhe, mock: false }
}
