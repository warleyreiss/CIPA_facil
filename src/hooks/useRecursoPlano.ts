import { useMemo } from 'react';
import { useProjeto } from '../contexts/ProjetoContext';
import {
  normalizarPlanoTipo,
  planosDisponiveisRecurso,
  RECURSOS_PLANO,
  rotuloPlano,
  rotulosPlanosDisponiveis,
  temRecurso,
  type RecursoId,
} from '../lib/recursosPlano';

export function useRecursoPlano() {
  const { assinatura } = useProjeto();
  const planoTipoRaw = assinatura?.plano_tipo ?? 'INICIANTE';
  const planoTipo = normalizarPlanoTipo(planoTipoRaw);

  return useMemo(
    () => ({
      planoTipo,
      planoTipoRaw,
      tem: (recurso: RecursoId) => temRecurso(planoTipoRaw, recurso),
      meta: (recurso: RecursoId) => RECURSOS_PLANO[recurso],
      planosDisponiveis: (recurso: RecursoId) => planosDisponiveisRecurso(recurso),
      rotulosPlanos: (recurso: RecursoId) => rotulosPlanosDisponiveis(recurso),
      rotuloPlanoAtual: rotuloPlano(planoTipo),
    }),
    [planoTipo, planoTipoRaw],
  );
}
