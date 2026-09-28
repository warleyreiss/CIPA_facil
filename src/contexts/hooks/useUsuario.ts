import { useState, useCallback } from 'react';

export function useUsuario() {
  const [userData, setUserData] = useState<any>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailConfirmado, setEmailConfirmado] = useState<boolean>(false);
  const [authResolvido, setAuthResolvido] = useState<boolean>(false);

  const limparUsuario = useCallback(() => {
    setUserData(null);
    setEmailConfirmado(false);
    setAuthError(null);
    setIsOverlayVisible(false);
    setAuthResolvido(true);
  }, []);

  return {
    userData,
    setUserData,
    isOverlayVisible,
    setIsOverlayVisible,
    authError,
    setAuthError,
    emailConfirmado,
    setEmailConfirmado,
    authResolvido,
    setAuthResolvido,
    limparUsuario
  };
}