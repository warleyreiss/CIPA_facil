import { cargoDoMembro } from '../components/BadgeCargo';
import type { Acao } from './acaoService';
import { textoHorario } from './agendaReuniao';
import { ataParaHtml } from './ataHtml';
import { consultarCnpj, type EmpresaCnpj } from './consultaCnpj';
import { formatarDataBr, isoData, lerData } from './eleicao/etapasEleicao';
import type { MembroCipa, ReuniaoCipa } from './gestaoCipaService';
import { itensSumula, type PresencaReuniao } from './reuniaoDetalhe';
import { supabase } from './supabaseClient';

export type EmpresaImpressao = {
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
  cnae: string | null;
  cnaeDescricao: string | null;
  endereco: Partial<EmpresaCnpj> | null;
};

const TIPO = { ordinaria: 'ordinária', extraordinaria: 'extraordinária' };
const ORDEM_CARGO = { presidente: 0, vice: 1, membro: 2 } as const;

/** Até 20% além de uma página, o conteúdo encolhe para caber numa folha só. */
const ENCOLHER_ATE = 1.2;

function escapar(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatarCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : cnpj;
}

function dataPorExtenso(iso: string) {
  const texto = lerData(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function ordenarComissao(comissao: MembroCipa[]) {
  return [...comissao].sort((a, b) => {
    const cargo = ORDEM_CARGO[a.funcao] - ORDEM_CARGO[b.funcao];
    if (cargo) return cargo;
    if (a.condicao !== b.condicao) return a.condicao === 'titular' ? -1 : 1;
    if (a.representacao !== b.representacao) return a.representacao === 'organizacao' ? -1 : 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

function rotuloCargo(membro: MembroCipa) {
  return `${cargoDoMembro(membro).rotulo}${membro.condicao === 'titular' && membro.funcao === 'membro' ? ' titular' : ''}`;
}

function cabecalhoEmpresa(empresa: EmpresaImpressao) {
  const razao = empresa.razaoSocial || empresa.nome;
  const fantasia = empresa.endereco?.nomeFantasia && empresa.endereco.nomeFantasia !== razao ? empresa.endereco.nomeFantasia : '';
  return `
  <header class="empresa">
    <div>
      <h1>${escapar(razao)}</h1>
      ${fantasia ? `<div class="fantasia">${escapar(fantasia)}</div>` : ''}
    </div>
    ${empresa.cnpj ? `<div class="cnpj"><small>CNPJ</small>${escapar(formatarCnpj(empresa.cnpj))}</div>` : ''}
  </header>`;
}

function quadroAgenda(reuniao: ReuniaoCipa) {
  const horario = textoHorario({ horaInicio: reuniao.hora_inicio, horaFim: reuniao.hora_fim });
  return `
  <div class="quadro">
    <div><small>Data</small><span>${escapar(formatarDataBr(reuniao.data_reuniao))}</span></div>
    <div><small>Horário</small>${horario ? `<span>${escapar(horario)}</span>` : '<span class="linha"></span>'}</div>
    <div><small>Local</small>${reuniao.local ? `<span>${escapar(reuniao.local)}</span>` : '<span class="linha"></span>'}</div>
  </div>`;
}

function secaoSumula(itens: string[], titulo: string, vazio: string) {
  if (!itens.length) return `<section><h3>${titulo}</h3><p class="vazio">${vazio}</p></section>`;
  return `
  <section class="quebravel">
    <h3>${titulo}</h3>
    <ol class="sumula" data-linhas>${itens.map((item) => `<li>${escapar(item)}</li>`).join('')}</ol>
  </section>`;
}

const CSS_BASE = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #525659;
    color: #0f172a;
    font: 10.5pt/1.5 'Segoe UI', Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .fonte { width: 178mm; margin: 0 auto; padding: 16mm 0; background: #fff; }
  .pagina {
    position: relative;
    width: 210mm;
    height: 296mm;
    margin: 12px auto;
    padding: 16mm 16mm 0;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 2px 12px rgb(0 0 0 / 0.35);
  }
  .area {
    zoom: var(--escala, 1);
    height: calc(256mm / var(--escala, 1));
    overflow: hidden;
  }
  .area > :first-child { margin-top: 0; }
  .rodape { position: absolute; right: 16mm; bottom: 10mm; left: 16mm; padding-top: 5px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 8pt; text-align: center; }
  .rodape span { float: right; }
  @media print {
    body { background: #fff; }
    .pagina { margin: 0; box-shadow: none; break-after: page; }
    .pagina:last-child { break-after: auto; }
  }

  .empresa { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding-bottom: 10px; border-bottom: 2px solid #0f172a; }
  .empresa h1 { margin: 0; font-size: 14pt; letter-spacing: 0.01em; text-transform: uppercase; }
  .empresa .fantasia { color: #475569; font-size: 10pt; }
  .empresa .cnpj { flex-shrink: 0; font-size: 10pt; font-weight: 600; text-align: right; white-space: nowrap; }
  .empresa .cnpj small { display: block; color: #64748b; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.06em; }
  .titulo { margin: 22px 0 4px; text-align: center; }
  .titulo h2 { margin: 0; font-size: 15pt; letter-spacing: 0.04em; }
  .titulo p { margin: 2px 0 0; color: #475569; font-size: 9.5pt; }
  .abertura { margin: 18px 0 14px; text-align: justify; }
  .quadro { display: grid; grid-template-columns: 1.4fr 1fr 1.6fr; border: 1px solid #cbd5e1; border-radius: 4px; }
  .quadro div { padding: 8px 10px; }
  .quadro div + div { border-left: 1px solid #cbd5e1; }
  .quadro small { display: block; color: #64748b; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .quadro span { display: block; min-height: 1.5em; font-weight: 600; }
  .quadro .linha { border-bottom: 1px solid #94a3b8; }
  section { margin-top: 20px; }
  h3 { margin: 0 0 8px; font-size: 10pt; letter-spacing: 0.06em; text-transform: uppercase; }
  h3 em { color: #64748b; font-size: 8pt; font-style: normal; font-weight: 600; letter-spacing: 0; text-transform: none; }
  .sumula { margin: 0; padding-left: 2em; }
  .sumula li { padding: 2px 0; }
  .vazio { margin: 0; color: #64748b; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { padding: 6px 8px; border-bottom: 1.5px solid #0f172a; color: #334155; font-size: 7.5pt; letter-spacing: 0.06em; text-align: left; text-transform: uppercase; }
  td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: bottom; }
  td.num { width: 26px; color: #64748b; }
  td.assina { width: 34%; }
  .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 44px; }
  .assinaturas div { padding-top: 6px; border-top: 1px solid #0f172a; text-align: center; font-size: 9pt; }
  .assinaturas b { display: block; font-size: 9.5pt; }
`;

const CSS_ATA = `
  .ata { text-align: justify; }
  .ata > * { margin: 0 0 8px; }
  .ata h2 { margin-top: 14px; font-size: 12pt; }
  .ata h3 { margin-top: 12px; font-size: 11pt; letter-spacing: 0; text-transform: none; }
  .ata ul, .ata ol { padding-left: 1.4em; }
  .ata blockquote { padding-left: 10px; border-left: 3px solid #cbd5e1; color: #334155; }
  .presenca { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .presenca div { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 4px; }
  .presenca small { display: block; margin-bottom: 4px; color: #64748b; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .presenca ul { margin: 0; padding-left: 1.1em; }
  .presenca em { display: block; color: #475569; font-size: 8.5pt; }
  .alterada { margin-top: 14px; color: #92400e; font-size: 8.5pt; }
`;

/** Os filhos de `.fonte` são os blocos; `escreverEImprimir` monta as páginas a partir deles. */
function documento(css: string, blocos: string) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>&#8203;</title>
<style>${CSS_BASE}${css}</style>
</head>
<body>
  <div class="fonte">${blocos}</div>
</body>
</html>`;
}

export function htmlConvocacao(reuniao: ReuniaoCipa, empresa: EmpresaImpressao, comissao: MembroCipa[]) {
  const tipo = TIPO[reuniao.tipo];
  const razao = empresa.razaoSocial || empresa.nome;
  const presidente = comissao.find((membro) => membro.funcao === 'presidente');
  const membros = ordenarComissao(comissao);

  const linhasMembros = membros.length
    ? membros.map((membro, indice) => `
        <tr>
          <td class="num">${indice + 1}</td>
          <td><b>${escapar(membro.nome)}</b></td>
          <td>${membro.representacao === 'organizacao' ? 'Organização' : 'Empregados'}</td>
          <td>${escapar(rotuloCargo(membro))}</td>
          <td class="assina"></td>
        </tr>`).join('')
    : '<tr><td colspan="5" class="vazio">Nenhum membro em exercício.</td></tr>';

  return documento('', `
  ${cabecalhoEmpresa(empresa)}

  <section class="titulo">
    <h2>CONVOCAÇÃO PARA REUNIÃO ${tipo.toUpperCase()}</h2>
    <p>Comissão Interna de Prevenção de Acidentes e de Assédio — CIPA · NR-05</p>
  </section>

  <p class="abertura">
    Nos termos da NR-05, ficam convocados os membros da CIPA de <b>${escapar(razao)}</b> para a reunião
    ${tipo} a realizar-se em <b>${escapar(dataPorExtenso(reuniao.data_reuniao))}</b>, conforme a súmula abaixo.
  </p>

  ${quadroAgenda(reuniao)}

  ${secaoSumula(itensSumula(reuniao), 'Súmula prevista', 'A súmula será definida e comunicada antes da reunião.')}

  <section class="quebravel">
    <h3>Membros convocados</h3>
    <table>
      <thead>
        <tr><th>#</th><th>Nome</th><th>Representação</th><th>Cargo</th><th>Ciente · assinatura</th></tr>
      </thead>
      <tbody data-linhas>${linhasMembros}</tbody>
    </table>
  </section>

  <section class="assinaturas">
    <div><b>${presidente ? escapar(presidente.nome) : '&nbsp;'}</b>Presidente da CIPA</div>
    <div><b>${escapar(formatarDataBr(isoData(new Date())))}</b>Data da convocação</div>
  </section>`);
}

export async function carregarEmpresa(projetoId: string, nomeProjeto: string): Promise<EmpresaImpressao> {
  const { data } = await supabase.from('projetos').select('*').eq('id', projetoId).maybeSingle();
  const projeto = (data ?? {}) as Record<string, string | null>;
  const cnpj = (projeto.cnpj ?? '').replace(/\D/g, '');
  const endereco = cnpj.length === 14 ? await consultarCnpj(cnpj).catch(() => null) : null;
  return {
    nome: projeto.nome || nomeProjeto,
    razaoSocial: projeto.razao_social || endereco?.razaoSocial || null,
    cnpj: cnpj || null,
    cnae: projeto.cnae || endereco?.cnae || null,
    cnaeDescricao: projeto.cnae_descricao || endereco?.cnaeDescricao || null,
    endereco,
  };
}

export function htmlAta(
  reuniao: ReuniaoCipa,
  empresa: EmpresaImpressao,
  comissao: MembroCipa[],
  presenca: PresencaReuniao[],
  acoes: Acao[],
  reescritaEm?: string | null,
) {
  const tipo = TIPO[reuniao.tipo];
  const horario = textoHorario({ horaInicio: reuniao.hora_inicio, horaFim: reuniao.hora_fim });
  const marcas = new Map(presenca.map((item) => [item.membro_id, item]));
  const membros = ordenarComissao(comissao);
  const situacao = (membro: MembroCipa) => marcas.get(membro.id)?.situacao ?? 'faltante';
  const presentes = membros.filter((membro) => situacao(membro) === 'presente');
  const faltantes = membros.filter((membro) => situacao(membro) === 'faltante');
  const justificados = membros.filter((membro) => situacao(membro) === 'justificado');
  const lista = (grupo: MembroCipa[], comJustificativa = false) =>
    grupo.length
      ? `<ul>${grupo
          .map((membro) => {
            const motivo = comJustificativa ? marcas.get(membro.id)?.justificativa : null;
            return `<li>${escapar(membro.nome)}${motivo ? `<em>${escapar(motivo)}</em>` : ''}</li>`;
          })
          .join('')}</ul>`
      : '<span class="vazio">Ninguém</span>';
  const daReuniao = acoes.filter((acao) => acao.reuniao_id === reuniao.id);
  const texto = ataParaHtml(reuniao.ata);

  return documento(CSS_ATA, `
  ${cabecalhoEmpresa(empresa)}

  <section class="titulo">
    <h2>ATA DA REUNIÃO ${tipo.toUpperCase()}</h2>
    <p>Comissão Interna de Prevenção de Acidentes e de Assédio — CIPA · NR-05</p>
  </section>

  <p class="abertura">
    Em <b>${escapar(dataPorExtenso(reuniao.data_reuniao))}</b>${horario ? `, ${horario.startsWith('a partir') ? '' : 'das '}${escapar(horario)}` : ''}${reuniao.local ? `, em ${escapar(reuniao.local)}` : ''},
    reuniram-se os membros da CIPA de <b>${escapar(empresa.razaoSocial || empresa.nome)}</b> em reunião ${tipo}, para tratar da súmula abaixo.
  </p>

  ${secaoSumula(itensSumula(reuniao), 'Súmula', 'Sem súmula prevista.')}

  ${texto
    ? `<section class="quebravel"><h3>Registro da reunião</h3><div class="ata" data-linhas>${texto}</div></section>`
    : '<section><h3>Registro da reunião</h3><p class="vazio">Sem registro.</p></section>'}

  <section>
    <h3>Presença</h3>
    <div class="presenca">
      <div><small>Presentes (${presentes.length})</small>${lista(presentes)}</div>
      <div><small>Ausentes (${faltantes.length})</small>${lista(faltantes)}</div>
      <div><small>Justificados (${justificados.length})</small>${lista(justificados, true)}</div>
    </div>
  </section>

  ${daReuniao.length ? `
  <section class="quebravel">
    <h3>Ações tratadas</h3>
    <table>
      <thead><tr><th>#</th><th>Ação</th><th>Situação</th><th>Realizado</th></tr></thead>
      <tbody data-linhas>${daReuniao.map((acao, indice) => `
        <tr>
          <td class="num">${indice + 1}</td>
          <td><b>${escapar(acao.titulo)}</b></td>
          <td>${acao.status === 'concluida' ? 'Concluída' : 'Em aberto'}</td>
          <td>${escapar(acao.realizado ?? '')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </section>` : ''}

  <section class="quebravel">
    <h3>Assinaturas dos presentes</h3>
    <table>
      <thead><tr><th>#</th><th>Nome</th><th>Cargo</th><th>Assinatura</th></tr></thead>
      <tbody data-linhas>${presentes.length ? presentes.map((membro, indice) => `
        <tr>
          <td class="num">${indice + 1}</td>
          <td><b>${escapar(membro.nome)}</b></td>
          <td>${escapar(rotuloCargo(membro))}</td>
          <td class="assina"></td>
        </tr>`).join('') : '<tr><td colspan="4" class="vazio">Nenhum presente marcado.</td></tr>'}
      </tbody>
    </table>
  </section>

  ${reescritaEm ? `<p class="alterada">Ata reescrita após a conclusão em ${escapar(new Date(reescritaEm).toLocaleString('pt-BR'))}. As versões anteriores ficam no histórico da reunião.</p>` : ''}`);
}

function novaPagina(doc: Document) {
  const pagina = doc.createElement('section');
  pagina.className = 'pagina';
  const area = doc.createElement('div');
  area.className = 'area';
  const rodape = doc.createElement('footer');
  rodape.className = 'rodape';
  rodape.textContent = 'Gerado com CIPA Fácil';
  pagina.append(area, rodape);
  doc.body.appendChild(pagina);
  return area;
}

function estourou(area: HTMLElement) {
  return area.scrollHeight > area.clientHeight + 1;
}

/**
 * Tira do fim do bloco as linhas que não cabem e devolve um bloco de continuação com elas.
 * Retorna null quando nem duas linhas cabem; aí o bloco inteiro vai para a próxima página.
 */
function dividir(bloco: HTMLElement, area: HTMLElement): HTMLElement | null {
  const linhas = bloco.querySelector<HTMLElement>('[data-linhas]');
  if (!linhas || linhas.children.length < 3) return null;
  const resto = bloco.cloneNode(true) as HTMLElement;
  const linhasResto = resto.querySelector<HTMLElement>('[data-linhas]');
  if (!linhasResto) return null;
  linhasResto.replaceChildren();

  while (estourou(area) && linhas.children.length > 2) {
    const ultima = linhas.lastElementChild;
    if (!ultima) break;
    linhasResto.prepend(ultima);
  }
  if (estourou(area) || !linhasResto.children.length) {
    linhas.append(...Array.from(linhasResto.children));
    return null;
  }

  if (linhas.tagName === 'OL') {
    const inicio = Number(linhas.getAttribute('start')) || 1;
    linhasResto.setAttribute('start', String(inicio + linhas.children.length));
  }
  const titulo = resto.querySelector('h3');
  if (titulo && !titulo.querySelector('em')) titulo.insertAdjacentHTML('beforeend', ' <em>(continuação)</em>');
  return resto;
}

/** Mede numa folha A4 real: se sobra pouco, encolhe para uma página; senão, quebra entre linhas e blocos. */
function paginar(doc: Document) {
  const fonte = doc.querySelector<HTMLElement>('.fonte');
  if (!fonte) return;
  const blocos = Array.from(fonte.children) as HTMLElement[];
  fonte.remove();

  let area = novaPagina(doc);
  area.append(...blocos);
  const proporcao = area.scrollHeight / area.clientHeight;
  if (proporcao > 1 && proporcao <= ENCOLHER_ATE) {
    doc.documentElement.style.setProperty('--escala', (1 / proporcao - 0.01).toFixed(3));
  }
  if (!estourou(area)) return;
  area.replaceChildren();

  const fila = [...blocos];
  while (fila.length) {
    const bloco = fila.shift() as HTMLElement;
    area.appendChild(bloco);
    if (!estourou(area)) continue;

    if (bloco.classList.contains('quebravel')) {
      const resto = dividir(bloco, area);
      if (resto) {
        fila.unshift(resto);
        area = novaPagina(doc);
        continue;
      }
    }
    if (area.childElementCount === 1) continue;
    bloco.remove();
    area = novaPagina(doc);
    fila.unshift(bloco);
  }
}

export function escreverEImprimir(janela: Window, html: string) {
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  const imprimir = async () => {
    await janela.document.fonts?.ready.catch(() => undefined);
    try {
      paginar(janela.document);
    } catch {
      // Sem paginação, o navegador ainda imprime o conteúdo corrido.
    }
    janela.focus();
    window.setTimeout(() => janela.print(), 100);
  };
  if (janela.document.readyState === 'complete') window.setTimeout(imprimir, 150);
  else janela.addEventListener('load', () => window.setTimeout(imprimir, 150), { once: true });
}
