import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_949dvml';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_MANUTENCAO || 'template_w1zf7pa';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'SrVcGaPKSnslyda7f';
const DESTINO_EMAIL = import.meta.env.VITE_ALERTA_MANUTENCAO_EMAIL || 'suporte.proativaweb@gmail.com';

const COOLDOWN_MS = 5 * 60 * 1000;
const alertasRecentes = new Map<string, number>();

export interface ReporteManutencaoParams {
  origem: string;
  erro: unknown;
  url?: string;
  status?: number;
  metodo?: string;
  userEmail?: string;
}

function extrairMensagem(erro: unknown): string {
  if (!erro) return 'Erro desconhecido';
  if (typeof erro === 'string') return erro;
  if (erro instanceof Error) return erro.message;
  const obj = erro as Record<string, unknown>;
  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.error_description === 'string') return obj.error_description;
  if (typeof obj.msg === 'string') return obj.msg;
  try {
    return JSON.stringify(erro);
  } catch {
    return String(erro);
  }
}

function extrairDetalhes(erro: unknown): string {
  if (!erro || typeof erro !== 'object') return 'Sem detalhes técnicos adicionais.';
  const obj = erro as Record<string, unknown>;
  const partes = [
    obj.stack,
    obj.details,
    obj.hint,
    obj.code,
  ].filter(Boolean);
  if (partes.length) return partes.map(String).join(' | ');
  try {
    return JSON.stringify(erro);
  } catch {
    return 'Sem detalhes técnicos adicionais.';
  }
}

/** Erros de uso normal — não disparam alerta de manutenção. */
export function isErroEsperadoUsuario(erro: unknown): boolean {
  const msg = extrairMensagem(erro).toLowerCase();
  const codigo = String((erro as { code?: string })?.code ?? '').toLowerCase();

  if (codigo === 'pgrst116') return true;
  if (msg.includes('limite_plano:')) return true;

  const padroesUsuario = [
    'invalid login',
    'invalid credentials',
    'email not confirmed',
    'email not confirmed',
    'already registered',
    'user already registered',
    'duplicate key',
    'jwt expired',
    'refresh token',
    'invalid refresh token',
    'session not found',
    'invalid grant',
    'email address invalid',
    'password should be',
    'signup requires',
    'user not found',
  ];

  return padroesUsuario.some((p) => msg.includes(p));
}

function deveReportarHttp(status: number, body: unknown, url: string): boolean {
  if (status >= 500) return true;

  const codigo = String((body as { code?: string })?.code ?? '').toLowerCase();
  const mensagem = extrairMensagem(body).toLowerCase();

  if (isErroEsperadoUsuario(body)) return false;
  if (codigo === 'pgrst116') return false;

  // 404 de schema/recurso ausente: ruído comum; não dispara e-mail em massa
  if (status === 404) {
    if (
      codigo.startsWith('pgrst') ||
      mensagem.includes('not find') ||
      mensagem.includes('does not exist') ||
      mensagem.includes('schema cache') ||
      url.includes('/storage/v1/')
    ) {
      return false;
    }
    return false;
  }

  if (status === 401 && url.includes('/auth/v1/')) return false;
  if (status === 400 && url.includes('/auth/v1/')) {
    return !isErroEsperadoUsuario(body);
  }

  if (status >= 400) {
    return !isErroEsperadoUsuario(body);
  }

  return false;
}

function chaveCooldown(params: ReporteManutencaoParams): string {
  const msg = extrairMensagem(params.erro).slice(0, 120);
  return `${params.origem}|${params.status ?? ''}|${params.url ?? ''}|${msg}`;
}

function emCooldown(chave: string): boolean {
  const ultimo = alertasRecentes.get(chave);
  if (!ultimo) return false;
  if (Date.now() - ultimo < COOLDOWN_MS) return true;
  alertasRecentes.delete(chave);
  return false;
}

function registrarCooldown(chave: string): void {
  alertasRecentes.set(chave, Date.now());
}

export function obterEmailUsuarioSessao(): string | undefined {
  try {
    const chave = Object.keys(localStorage).find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (!chave) return undefined;
    const raw = localStorage.getItem(chave);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.user?.email ?? parsed?.email;
  } catch {
    return undefined;
  }
}

export async function reportarErroManutencao(params: ReporteManutencaoParams): Promise<void> {
  if (isErroEsperadoUsuario(params.erro)) return;

  const chave = chaveCooldown(params);
  if (emCooldown(chave)) return;

  const msgErro = extrairMensagem(params.erro);
  const stackErro = extrairDetalhes(params.erro);
  const prefixo = params.status ? `[HTTP ${params.status}] ` : '';
  const contextoUrl = params.url ? `\nURL: ${params.metodo ?? 'GET'} ${params.url}` : '';

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: DESTINO_EMAIL,
        error_message: `${prefixo}[${params.origem}] ${msgErro}${contextoUrl}`,
        error_stack: stackErro,
        user_email: params.userEmail ?? obterEmailUsuarioSessao() ?? 'Não identificado',
        timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      },
      PUBLIC_KEY
    );
    registrarCooldown(chave);
  } catch (e) {
    console.error('Falha ao enviar e-mail de manutenção:', e);
  }
}

export function tentarReportarErroRequisicao(
  url: string,
  status: number,
  metodo: string,
  body: unknown
): void {
  if (!deveReportarHttp(status, body, url)) return;

  void reportarErroManutencao({
    origem: 'Supabase HTTP',
    erro: body ?? { message: `HTTP ${status}` },
    url: String(url),
    status,
    metodo,
  });
}
