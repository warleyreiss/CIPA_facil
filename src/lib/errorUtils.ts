export function extrairMensagemErro(erro: unknown): string {
  if (!erro) return 'Erro desconhecido';
  if (typeof erro === 'string') return erro;
  if (erro instanceof Error) return erro.message;
  const obj = erro as Record<string, unknown>;
  if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
  if (typeof obj.details === 'string' && obj.details.trim()) return obj.details;
  if (typeof obj.error_description === 'string') return obj.error_description;
  if (typeof obj.msg === 'string') return obj.msg;
  try {
    return JSON.stringify(erro);
  } catch {
    return String(erro);
  }
}

export function erroSupabase(etapa: string, erro: unknown): Error {
  const msg = extrairMensagemErro(erro);
  return new Error(`${etapa}: ${msg}`);
}
