import DOMPurify from 'dompurify';

const PERMITIDAS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr'];

function escapar(texto: string) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Atas antigas foram gravadas como texto puro; o editor precisa de HTML. */
export function ataParaHtml(ata: string | null | undefined): string {
  const texto = (ata ?? '').trim();
  if (!texto) return '';
  if (/^<[a-z][\s\S]*>/i.test(texto)) return limparHtmlAta(texto);
  return texto
    .split(/\r?\n{2,}/)
    .map((bloco) => `<p>${escapar(bloco).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');
}

export function limparHtmlAta(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: PERMITIDAS,
    ALLOWED_ATTR: ['style'],
  });
}

export function textoDaAta(html: string | null | undefined): string {
  const limpo = ataParaHtml(html);
  if (!limpo) return '';
  const caixa = document.createElement('div');
  caixa.innerHTML = limpo
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h2|h3|blockquote)>/gi, '</$1>\n\n')
    .replace(/<li>/gi, '<li>• ')
    .replace(/<\/li>/gi, '</li>\n');
  return (caixa.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}

export function ataVazia(html: string | null | undefined): boolean {
  return textoDaAta(html).length === 0;
}
