/**
 * Dados institucionais da marca para Edge Functions.
 * Espelho de src/config/empresa.ts — mantenha sincronizado.
 * Opcionalmente sobrescrito por comercial/empresa.json no Storage.
 */
export type EmpresaConfig = {
  nome: string
  marca: string
  marcaCasa: string
  titularLegal: string
  razaoSocial: string
  cnpj: string
  emailSuporte: string
  emailContato: string
  emailRemetente: string
  telefone: string
  website: string
  siteApp: string
  /** Domínio de marca / marketing (opcional). */
  siteMarca?: string
  rua: string
  numero: string
  cidade: string
  estado: string
  cep: string
  slogan: string
  logoUrl: string
}

export const EMPRESA_DEFAULT: EmpresaConfig = {
  nome: 'CIPA Fácil',
  marca: 'CIPA Fácil',
  marcaCasa: 'Proativa Web',
  titularLegal: 'Warley Gonçalves dos Reis',
  razaoSocial: 'Warley Gonçalves dos Reis',
  cnpj: '50.923.885/0001-79',
  emailSuporte: 'contato@proativaweb.com.br',
  emailContato: 'contato@proativaweb.com.br',
  emailRemetente: 'CIPA Fácil <contato@proativaweb.com.br>',
  telefone: '(31) 99999-9999',
  website: 'https://www.proativaweb.com.br',
  siteApp: 'http://localhost:5173',
  siteMarca: 'http://localhost:5173',
  rua: 'Doze',
  numero: '536',
  cidade: 'Esmeraldas',
  estado: 'MG',
  cep: '32807-132',
  slogan: 'Gestão da CIPA',
  logoUrl: '/favicon.svg',
}

export const EMPRESA_JSON_URL =
  'https://ndcpitpvaphhwoidcdhs.supabase.co/storage/v1/object/public/comercial/empresa.json'

let cache: EmpresaConfig | null = null
let cacheAt = 0
const CACHE_MS = 5 * 60 * 1000

export async function carregarEmpresa(): Promise<EmpresaConfig> {
  const agora = Date.now()
  if (cache && agora - cacheAt < CACHE_MS) return cache

  try {
    const res = await fetch(EMPRESA_JSON_URL, { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const data = (await res.json()) as Partial<EmpresaConfig>
      cache = { ...EMPRESA_DEFAULT, ...data }
      cacheAt = agora
      return cache
    }
  } catch (err) {
    console.warn('empresa.json indisponível; usando EMPRESA_DEFAULT', err)
  }

  cache = EMPRESA_DEFAULT
  cacheAt = agora
  return cache
}

export function enderecoEmpresa(e: EmpresaConfig): string {
  return `${e.rua}, nº ${e.numero} — ${e.cidade}/${e.estado}, CEP ${e.cep}`
}

/** Rodapé HTML padrão dos e-mails transacionais (marca + CNPJ; sem nome do MEI em evidência) */
export function rodapeEmailHtml(e: EmpresaConfig): string {
  const site = (e.siteApp || e.website).replace(/\/$/, '')
  const host = site.replace(/^https?:\/\//, '')
  const marca = e.marca || e.nome
  const marcaCasa = e.marcaCasa || 'Proativa Web'
  return `
    <tr>
      <td style="padding:24px 28px 28px;border-top:1px dashed #d8dce3;text-align:center;">
        <img src="${e.logoUrl}" alt="${marca}" width="120" style="display:inline-block;max-width:120px;height:auto;border:0;margin:0 0 12px;" />
        <p style="margin:0 0 6px;font-size:12px;color:#5c6678;">
          Enviado via <strong style="color:#1d4ed8;">${marca}™</strong> — ${e.slogan}
        </p>
        <p style="margin:0 0 4px;font-size:11px;color:#9aa3b2;">
          <a href="${site}" style="color:#1d4ed8;text-decoration:none;">${host}</a>
          · ${marcaCasa}™ · CNPJ ${e.cnpj}
        </p>
        <p style="margin:0;font-size:11px;color:#9aa3b2;">
          ${enderecoEmpresa(e)} ·
          <a href="mailto:${e.emailSuporte}" style="color:#1d4ed8;text-decoration:none;">${e.emailSuporte}</a>
          · ${e.telefone}
        </p>
      </td>
    </tr>`
}
