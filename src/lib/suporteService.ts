import { supabase } from './supabaseClient';
import { SUPORTE_TEMAS, type SuporteTemaSlug, tituloSuporteTema } from './suporteTemas';

export interface SuporteOrientacao {
  id: string;
  titulo: string;
  descricao: string;
  link_materiais: string | null;
  link_video: string | null;
}

export function urlSuporteOrientacao(id: string): string {
  return `/suporte?id=${encodeURIComponent(id)}`;
}

export { urlSuportePorTema } from './suporteTemas';
export type { SuporteTemaSlug } from './suporteTemas';

export async function listarOrientacoesSuporte(): Promise<SuporteOrientacao[]> {
  const { data, error } = await supabase
    .from('suporte_orientacoes')
    .select('id, titulo, descricao, link_materiais, link_video')
    .order('titulo', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function buscarOrientacaoPorTema(slug: SuporteTemaSlug): Promise<SuporteOrientacao | null> {
  const titulo = tituloSuporteTema(slug);
  const { data, error } = await supabase
    .from('suporte_orientacoes')
    .select('id, titulo, descricao, link_materiais, link_video')
    .eq('titulo', titulo)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function buscarOrientacaoPorId(id: string): Promise<SuporteOrientacao | null> {
  const { data, error } = await supabase
    .from('suporte_orientacoes')
    .select('id, titulo, descricao, link_materiais, link_video')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function filtrarOrientacoes(
  lista: SuporteOrientacao[],
  termo: string
): SuporteOrientacao[] {
  const q = termo.trim().toLowerCase();
  if (!q) return lista;

  return lista.filter(
    (item) =>
      item.titulo.toLowerCase().includes(q) || item.descricao.toLowerCase().includes(q)
  );
}

export function resumoDescricao(descricao: string, max = 140): string {
  const linha = descricao.replace(/\s+/g, ' ').trim();
  if (linha.length <= max) return linha;
  return `${linha.slice(0, max).trim()}…`;
}

export function extrairEmbedVideo(url: string | null): string | null {
  if (!url?.trim()) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === 'vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function isLinkInterno(href: string | null): boolean {
  return !!href && href.startsWith('/');
}

export function resolverOrientacaoPorTema(
  lista: SuporteOrientacao[],
  slug: SuporteTemaSlug
): SuporteOrientacao | undefined {
  const titulo = tituloSuporteTema(slug);
  return lista.find((item) => item.titulo === titulo);
}

export function isSuporteTemaSlug(valor: string | null): valor is SuporteTemaSlug {
  return !!valor && valor in SUPORTE_TEMAS;
}

export type SuporteCategoriaId =
  | 'comecar'
  | 'projetos'
  | 'planos'
  | 'dashboard'
  | 'equipamentos'
  | 'funcoes'
  | 'colaboradores'
  | 'esocial'
  | 'conta'
  | 'geral';

export interface SuporteCategoria {
  id: SuporteCategoriaId;
  rotulo: string;
  icon: string;
  accent: string;
}

export const SUPORTE_CATEGORIAS: SuporteCategoria[] = [
  { id: 'comecar', rotulo: 'Começar', icon: 'pi-flag', accent: 'start' },
  { id: 'projetos', rotulo: 'Projetos', icon: 'pi-building', accent: 'proj' },
  { id: 'planos', rotulo: 'Planos', icon: 'pi-sparkles', accent: 'plan' },
  { id: 'dashboard', rotulo: 'Dashboard', icon: 'pi-chart-bar', accent: 'dash' },
  { id: 'equipamentos', rotulo: 'Equipamentos', icon: 'pi-shield', accent: 'epi' },
  { id: 'funcoes', rotulo: 'Funções', icon: 'pi-sitemap', accent: 'fn' },
  { id: 'colaboradores', rotulo: 'Colaboradores', icon: 'pi-users', accent: 'colab' },
  { id: 'esocial', rotulo: 'eSocial', icon: 'pi-file-export', accent: 'eso' },
  { id: 'conta', rotulo: 'Conta & equipe', icon: 'pi-user', accent: 'conta' },
  { id: 'geral', rotulo: 'Geral', icon: 'pi-book', accent: 'geral' },
];

const CATEGORIA_POR_PADRAO: Array<{ id: SuporteCategoriaId; re: RegExp }> = [
  { id: 'comecar', re: /comece|onboarding|boas-vindas|confirmação de cadastro|esqueci minha senha|e-mail de confirmação|definir ou redefinir minha senha|importar dados iniciais/i },
  { id: 'projetos', re: /projeto/i },
  { id: 'planos', re: /plano|upgrade|downgrade|fatura|cobrança|pagamento|assinatura|iniciante|limite|recurso bloqueado|logo padrão/i },
  { id: 'dashboard', re: /dashboard|índices cepi|alertas do sino|indicadores/i },
  { id: 'esocial', re: /esocial|s-2240|gabarito|sem cpf/i },
  { id: 'equipamentos', re: /equipamento|epi|estoque|fornecimento|entrega|ca\b|certificado|estorno|validação digital|periodicidade|pedido de compra|nf-e|modo emergencial|matriz de epis/i },
  { id: 'funcoes', re: /funç|ghe|alterações de epis por função/i },
  { id: 'colaboradores', re: /colaborador|trocas de função|inativad/i },
  { id: 'conta', re: /convidar|usuário|comunicado|excluir um projeto|google|dados do plano/i },
];

export function categorizarOrientacao(titulo: string): SuporteCategoria {
  const hit = CATEGORIA_POR_PADRAO.find((c) => c.re.test(titulo));
  const id = hit?.id ?? 'geral';
  return SUPORTE_CATEGORIAS.find((c) => c.id === id) ?? SUPORTE_CATEGORIAS[SUPORTE_CATEGORIAS.length - 1];
}

export function estimarMinutosLeitura(descricao: string): number {
  const palavras = descricao.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(palavras / 180));
}

export function paragrafosDescricao(descricao: string): string[] {
  return descricao
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}|\n(?=\s*[-•]|\d+\.)/)
    .map((p) => p.trim())
    .filter(Boolean);
}
