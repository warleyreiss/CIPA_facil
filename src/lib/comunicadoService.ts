import { supabase } from './supabaseClient';
import type { ComunicadoSistema } from '../types/types';

function bateAlvo(
  alvos: string[] | null | undefined,
  valor: string | null | undefined
): boolean {
  if (!alvos || alvos.length === 0) return true;
  if (!valor) return false;
  const v = valor.toUpperCase();
  return alvos.some((a) => String(a).toUpperCase() === v);
}

export const comunicadoService = {
  async listarPendentes(
    usuarioId: string,
    contexto?: {
      planoTipo?: string | null;
      assinaturaTipo?: string | null;
    }
  ): Promise<ComunicadoSistema[]> {
    const [{ data: comunicados, error: errComunicados }, { data: dismisses, error: errDismiss }] =
      await Promise.all([
        supabase
          .from('comunicados_sistema')
          .select(
            'id, titulo, mensagem, tipo, ativo, prioridade, inicia_em, expira_em, created_at, planos_alvo, assinatura_tipos_alvo'
          )
          .order('prioridade', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('comunicados_dismiss')
          .select('comunicado_id')
          .eq('usuario_id', usuarioId),
      ]);

    if (errComunicados) throw errComunicados;
    if (errDismiss) throw errDismiss;

    const dismissIds = new Set((dismisses ?? []).map((d) => d.comunicado_id));
    const planoTipo = contexto?.planoTipo ?? null;
    const assinaturaTipo = contexto?.assinaturaTipo ?? null;

    return (comunicados ?? []).filter((c) => {
      if (dismissIds.has(c.id)) return false;
      if (!bateAlvo(c.planos_alvo, planoTipo)) return false;
      if (!bateAlvo(c.assinatura_tipos_alvo, assinaturaTipo)) return false;
      return true;
    });
  },

  async registrarDismiss(usuarioId: string, comunicadoId: string): Promise<void> {
    const { error } = await supabase.from('comunicados_dismiss').insert({
      usuario_id: usuarioId,
      comunicado_id: comunicadoId,
    });

    if (error && error.code !== '23505') {
      throw error;
    }
  },
};
