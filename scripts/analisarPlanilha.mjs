/**
 * Script de análise de planilha Excel — diagnóstico de compatibilidade
 * Uso: node scripts/analisarPlanilha.mjs "caminho/para/arquivo.xlsx"
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const arquivo = process.argv[2] ?? 'C:/Users/warle/OneDrive/Desktop/SSMA_CONTROLE_DE_EPI.xlsm (1).xlsx';

if (!existsSync(arquivo)) {
  console.error('❌ Arquivo não encontrado:', arquivo);
  process.exit(1);
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log(' ANÁLISE DE PLANILHA — Compatibilidade com sistema de Import');
console.log('═══════════════════════════════════════════════════════════');
console.log('📄 Arquivo:', path.basename(arquivo));

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(arquivo);

const PALAVRAS_CHAVE = {
  agendamentos:   ['previsto', 'prevista', 'data prevista', 'fornecimento previsto', 'pendente', 'agendamento', 'programado'],
  colaboradores:  ['nome', 'funcionario', 'colaborador', 'empregado', 'cpf', 'matricula', 'admissao', 'cargo', 'funcao', 'pn', 'prontuario', 'chapa', 'cracha', 'cc', 'responsavel'],
  cargos:         ['cargo', 'funcao', 'nomenclatura', 'ghe', 'grupo', 'setor', 'departamento'],
  epis:           ['epi', 'equipamento', 'ca', 'certificado', 'tamanho', 'prazo', 'estoque', 'item', 'descricao', 'vde', 'qde', 'qtd', 'quantidade', 'cod', 'codigo', 'saldo', 'minimo', 'ideal', 'situacao', 'validade'],
  fornecimentos:  ['entrega', 'periodicidade', 'vencimento', 'status operacional', 'data de entrega', 'data entrega'],
  matriz:         ['matriz', 'cargo', 'epi'],
};

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')   // colapsa espaços duplos (ex: "CÓD. EPI" → "cod epi")
    .trim();
}

function pontuarTipo(cabecalho, amostra = []) {
  const norm = cabecalho.map(normalizar);
  const scores = { agendamentos: 0, colaboradores: 0, cargos: 0, epis: 0, fornecimentos: 0, matriz: 0 };
  for (const [tipo, palavras] of Object.entries(PALAVRAS_CHAVE)) {
    if (!(tipo in scores)) scores[tipo] = 0;
    for (const col of norm) {
      for (const p of palavras) {
        if (col.includes(normalizar(p))) scores[tipo]++;
      }
    }
  }

  // Heurísticas adicionais (espelhando excelAnalyzer.ts)
  const temCpf = norm.some(c => c === 'cpf' || c.includes('cpf'));
  if (temCpf) scores['colaboradores'] += 5;
  const temPn = norm.some(c => c === 'pn' || c === 'prontuario' || c === 'chapa');
  if (temPn) scores['colaboradores'] += 3;
  const temNome = norm.some(c => c === 'nome');
  const temFuncao = norm.some(c => c === 'funcao' || c === 'cargo');
  if (temNome && temFuncao) scores['colaboradores'] += 4;
  const temCa = norm.some(c => c === 'ca' || c === 'certificado de aprovacao');
  if (temCa) scores['epis'] += 3;

  // Tabela de estoque de EPI: CA + (saldo | minimo | ideal)
  const temSaldo = norm.some(c => c === 'saldo' || c.includes('saldo'));
  const temMinimo = norm.some(c => c === 'minimo' || c === 'ideal' || c === 'situacao');
  if (temCa && (temSaldo || temMinimo)) scores['epis'] += 4;

  // Agendamentos: estrutura de colaboradores com data prevista de fornecimento
  const temDataPrevista = norm.some(c => c.includes('prevista') || c.includes('previsto') || c.includes('programad'));
  const temFornecimentoNaCol = norm.some(c => c.includes('fornecimento') || c.includes('agendamento') || c.includes('pendente'));
  const temColabEstrutura = norm.some(c => c.includes('nome') || c.includes('colaborador'))
    && norm.some(c => c.includes('matricula') || c === 'cpf');
  if (temColabEstrutura && (temDataPrevista || temFornecimentoNaCol)) {
    scores['agendamentos'] += 8;
    if (temDataPrevista && temFornecimentoNaCol) scores['agendamentos'] += 3;
    if (temCpf) scores['agendamentos'] += 1;
    scores['colaboradores'] = Math.max(0, scores['colaboradores'] - 4);
  }

  // Fornecimentos – Padrão 1: tem "entrega" + EPI nos cabeçalhos
  const temEntrega = norm.some(c => c.includes('entrega'));
  const temPeriodicidade = norm.some(c => c.includes('periodicidade') || c.includes('vencimento'));
  const temStatusOp = norm.some(c => c.includes('status') || c.includes('operacional'));
  const temEpiOuEquip = norm.some(c => c.includes('equipamento') || c.includes('epi'));
  // COD. EPI / CÓD. EPI / CÓDIGO EPI → sinal inequívoco de log de fornecimento
  const temCodEpiExplicito = norm.some(c => c.includes('cod epi') || c.includes('codigo epi') || c.includes('descricao epi'));
  if (temEntrega && temEpiOuEquip) {
    scores['fornecimentos'] += 5;
    if (temPeriodicidade) scores['fornecimentos'] += 2;
    if (temStatusOp)      scores['fornecimentos'] += 1;
    if (temCpf)           scores['fornecimentos'] += 2;
    // COD. EPI presente com ENTREGA = log de fornecimento definitivo
    if (temCodEpiExplicito) {
      scores['fornecimentos'] += 6;
      scores['colaboradores'] = Math.max(0, scores['colaboradores'] - 5);
    }
  }

  // Fornecimentos – Padrão 2: log de movimentações (DATA/ENTREGA + funcionário + COD_EPI + qtd)
  // "ENTREGA" conta como data-coluna (data da entrega do EPI)
  const temData = norm.some(c => c === 'data' || c.startsWith('data ') || c === 'dt' || c === 'entrega');
  const temFuncionario = norm.some(c => c.includes('funcionario') || c.includes('colaborador') || c.includes('matricula') || c === 'nome');
  const temCodOuDescEpi = temCodEpiExplicito; // reutiliza
  const temTamanhoOuQtd = norm.some(c => c === 'tamanho' || c === 'tam' || c === 'qtd' || c === 'qde' || c === 'quantidade');
  const temTipoMov = norm.some(c => c.includes('tipo mov') || c.includes('tipo acao') || c === 'mov' || c === 'operacao');
  if (temData && temFuncionario && temCodOuDescEpi && temTamanhoOuQtd) {
    scores['fornecimentos'] += 9;
    if (temCpf) scores['fornecimentos'] += 2;
    if (temTipoMov) scores['fornecimentos'] += 2;
    scores['epis'] = Math.max(0, scores['epis'] - 3);
    scores['colaboradores'] = Math.max(0, scores['colaboradores'] - 4);
  }

  // Cabeçalhos genéricos (Colunas1…N): tenta inferir pelo valor dos dados
  const todosGenericos = cabecalho.length >= 3 &&
    cabecalho.every(c => /^(colunas?|columns?|col)\s*\d+$/i.test(c.replace(/\s/g, '')));
  if (todosGenericos && amostra && amostra.length > 0) {
    const vals = Object.values(amostra[0]);
    const temProntuario = vals.some(v => typeof v === 'string' && /^\d{3,7}$/.test(v.trim()));
    const temNomeMaiusculo = vals.some(v =>
      typeof v === 'string' && v.trim().length > 8 &&
      v.trim() === v.trim().toUpperCase() && v.trim().includes(' ')
    );
    if (temProntuario && temNomeMaiusculo) scores['colaboradores'] += 8;
  }

  // Matriz Cargo×EPI: reforço quando 1ª coluna tem "cargo" e demais têm referências "(EPI-..."
  const primeiraCol = norm[0] ?? '';
  const colsComRefEpi = norm.slice(1).filter(c => c.includes('epi-') || /\bepi\b.*\d/.test(c));
  if (primeiraCol.includes('cargo') && colsComRefEpi.length >= 2) {
    scores['matriz'] += colsComRefEpi.length * 2;
    scores['epis'] = Math.max(0, scores['epis'] - colsComRefEpi.length);
  }

  const melhor = Object.entries(scores).sort(([,a],[,b]) => b-a)[0];
  return { tipo: melhor[0], pontuacao: melhor[1], scores };
}

console.log(`\n📋 ABAS ENCONTRADAS: ${workbook.worksheets.length}\n`);

// ── Diagnóstico detalhado da aba problemática ──────────────────────────────
const abaDiag = workbook.getWorksheet('ControleDeEstoque');
if (abaDiag) {
  console.log('\n🔬 DIAGNÓSTICO PROFUNDO: "ControleDeEstoque"');
  let n = 0;
  abaDiag.eachRow({ includeEmpty: true }, (row, rowNum) => {
    if (rowNum > 15) return;
    const vals = [];
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      if (colNum <= 20) {
        const v = cell.value != null ? String(cell.value).trim() : '∅';
        vals.push(`[${colNum}]=${v}`);
      }
    });
    const linha = vals.join(' ');
    if (linha.replace(/\[.\]=∅/g,'').trim()) {
      console.log(`   Linha ${String(rowNum).padStart(2,'0')}: ${linha.substring(0,120)}`);
      n++;
    }
  });
  console.log(`   (${n} linhas com conteúdo mostradas)\n`);
}
// ───────────────────────────────────────────────────────────────────────────

/** Extrai valor legível de uma célula ExcelJS (resolve fórmulas, datas, rich text) */
function extrairValor(v) {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toLocaleDateString('pt-BR');
    if ('result' in v) return String(v.result ?? '');
    if ('text' in v) return String(v.text ?? '');
    return '';
  }
  return String(v);
}

/**
 * Pontuação de "qualidade de cabeçalho" para uma linha.
 * Uma linha é boa candidata a cabeçalho se tem ≥3 células com texto descritivo
 * (não números puros, não células não-resolvidas).
 */
function pontosLinha(vals) {
  const slice = vals.slice(1);
  let pontos = 0;
  let celulasTexto = 0;
  for (const v of slice) {
    const s = extrairValor(v).trim();
    if (!s || s.startsWith('[object')) continue;
    if (/^\d+([.,]\d+)?$/.test(s)) continue;
    const propDigitos = (s.replace(/\D/g, '').length / s.length);
    if (propDigitos < 0.6) {
      celulasTexto++;
      pontos++;
      if (s.length <= 30) pontos++;
    }
  }
  return celulasTexto >= 3 ? pontos : 0;
}

for (const ws of workbook.worksheets) {
  const primeiras = [];
  let totalLinhas = 0;
  const LINHAS_SCAN = 12;

  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    totalLinhas++;
    if (rowNum <= LINHAS_SCAN) primeiras.push({ num: rowNum, vals: [...(row.values)] });
  });

  // Detecta linha de cabeçalho real varrendo até LINHAS_SCAN
  let linhaHeader = primeiras[0]?.num ?? 1;
  let melhorPontos = 0;
  for (const l of primeiras) {
    const pts = pontosLinha(l.vals);
    if (pts > melhorPontos) { melhorPontos = pts; linhaHeader = l.num; }
  }

  const cabecalhoRow = primeiras.find(l => l.num === linhaHeader);
  const cabecalho = [];
  (cabecalhoRow?.vals ?? []).forEach((v, i) => {
    if (i > 0) {
      const s = extrairValor(v).trim();
      if (s && !s.startsWith('[object')) cabecalho.push(s);
    }
  });

  const amostras = [];
  for (const l of primeiras) {
    if (l.num <= linhaHeader) continue;
    if (amostras.length >= 3) break;
    // Pula linhas sem dados reais
    const temDado = l.vals.slice(1, cabecalho.length + 1).some(v => {
      const s = extrairValor(v).trim();
      return s && !s.startsWith('[object');
    });
    if (!temDado) continue;
    const obj = {};
    l.vals.forEach((v, i) => {
      if (i > 0 && i <= cabecalho.length) obj[cabecalho[i-1]] = extrairValor(v);
    });
    amostras.push(obj);
  }

  const linhasDados = Math.max(0, totalLinhas - linhaHeader);
  const { tipo, pontuacao, scores } = pontuarTipo(cabecalho, amostras);
  const tipoDetectado = pontuacao >= 2 ? tipo : 'não identificado';

  console.log(`─────────────────────────────────────────────`);
  console.log(`📑 ABA: "${ws.name}"`);
  console.log(`   Total de linhas de dados: ${linhasDados}`);
  console.log(`   Tipo detectado:           ${tipoDetectado.toUpperCase()} (score: ${pontuacao})`);
  console.log(`   Scores por tipo:`, JSON.stringify(scores));
  console.log(`   Colunas (${cabecalho.length}):`, cabecalho.slice(0, 12).join(' | ') + (cabecalho.length > 12 ? ' ...' : ''));
  
  if (amostras.length > 0) {
    console.log(`\n   📌 Amostra (linha 2):`);
    const linha = amostras[0];
    for (const [col, val] of Object.entries(linha).slice(0, 8)) {
      if (val.trim()) console.log(`      "${col}" → "${val}"`);
    }
  }
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Análise concluída. Verifique os tipos detectados acima.');
console.log('═══════════════════════════════════════════════════════════\n');
