import { useProjeto } from '../contexts/ProjetoContext';

export function useConfigPermissoes() {
  const { funcaoUsuario, userData, assinatura } = useProjeto();

  const isGestor = funcaoUsuario === 'GESTOR';
  const isProprietario =
    !!userData?.id &&
    !!assinatura?.proprietario_id &&
    assinatura.proprietario_id === userData.id;

  return { isGestor, isProprietario, funcaoUsuario, userData, assinatura };
}
