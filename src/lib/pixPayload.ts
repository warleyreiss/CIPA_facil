/**
 * Monta payload PIX estático (BR Code / copia-e-cola) conforme EMV do Bacen.
 */

function emv(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

/** CRC16-CCITT-FALSE (polinômio 0x1021), usado no campo 63 do PIX. */
function crc16CcittFalse(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function sanitizarNome(nome: string, max = 25): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase();
}

function sanitizarCidade(cidade: string, max = 15): string {
  return sanitizarNome(cidade, max);
}

export interface PixEstaticoInput {
  chave: string;
  nomeRecebedor: string;
  cidade: string;
  /** Valor opcional (ex.: 25.00). Sem valor, o doador escolhe no app do banco. */
  valor?: number | null;
  /** Identificador curto da transação (máx. 25). */
  txid?: string;
}

export function montarPixCopiaECola(input: PixEstaticoInput): string {
  const chave = input.chave.trim();
  const nome = sanitizarNome(input.nomeRecebedor) || 'CONTROLEEPI';
  const cidade = sanitizarCidade(input.cidade) || 'BRASIL';
  const txid = (input.txid || 'DOACAO').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

  const mai = emv('00', 'br.gov.bcb.pix') + emv('01', chave);

  let payload =
    emv('00', '01') +
    emv('26', mai) +
    emv('52', '0000') +
    emv('53', '986') +
    (input.valor != null && input.valor > 0
      ? emv('54', input.valor.toFixed(2))
      : '') +
    emv('58', 'BR') +
    emv('59', nome) +
    emv('60', cidade) +
    emv('62', emv('05', txid)) +
    '6304';

  return payload + crc16CcittFalse(payload);
}
