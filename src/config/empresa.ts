/**
 * Identidade pública vs. dados legais (MEI).
 * - Use `nome` / `marca` / `marcaCasa` na UI de marketing e rodapé.
 * - Use `titularLegal` + `cnpj` só em páginas legais (Termos, Privacidade, Cookies)
 *   e onde a lei exigir identificação do prestador — sem destacar o nome na landing.
 *
 * ™ = marca em uso (não afirma registro no INPI). Se houver registro futuro, trocar para ®.
 */
export const EMPRESA = {
  /** Nome do produto / domínio comercial */
  nome: 'CIPA Fácil',
  /** Marca do produto (software / serviço) */
  marca: 'CIPA Fácil',
  /** Marca de serviços da operação (casa / publisher) */
  marcaCasa: 'Proativa Web',
  /** Razão social do MEI — exibir só onde for obrigatório identificar o titular. */
  titularLegal: 'Warley Gonçalves dos Reis',
  /** @deprecated Preferir titularLegal; mantido para compatibilidade. */
  razaoSocial: 'Warley Gonçalves dos Reis',
  cnpj: '50.923.885/0001-79',
  emailSuporte: 'contato@proativaweb.com.br',
  emailContato: 'contato@proativaweb.com.br',
  /** Remetente Resend / SMTP: "Nome <email>" */
  emailRemetente: 'CIPA Fácil <contato@proativaweb.com.br>',
  telefone: '(31) 99999-9999',
  website: 'https://www.proativaweb.com.br',
  /** URL pública do produto (app autenticado — Auth/Stripe/e-mails). */
  siteApp: 'http://localhost:5173',
  /** Domínio de marca. Preencha quando o site público existir. */
  siteMarca: 'http://localhost:5173',
  rua: 'Doze',
  numero: '536',
  cidade: 'Esmeraldas',
  estado: 'MG',
  cep: '32807-132',
  slogan: 'Gestão da CIPA',
  /** Chave PIX para doações (e-mail) */
  emailDoacao: 'contato@proativaweb.com.br',
  logoUrl: '/favicon.svg',
  /** JSON espelho no Storage (edge functions podem atualizar sem redeploy) */
  configUrl:
    'https://ndcpitpvaphhwoidcdhs.supabase.co/storage/v1/object/public/comercial/empresa.json',
  /** Google AdSense (mesmo publisher da Proativa Web) */
  adsenseClient: 'ca-pub-1646922689945004',
} as const;

export type EmpresaConfig = typeof EMPRESA;

export function enderecoEmpresa(e: Pick<EmpresaConfig, 'rua' | 'numero' | 'cidade' | 'estado' | 'cep'> = EMPRESA): string {
  return `${e.rua}, nº ${e.numero} — ${e.cidade}/${e.estado}, CEP ${e.cep}`;
}
