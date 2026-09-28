import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';
import { appUrl } from './appUrl';

const OAUTH_REDIRECT_PATH = '/inicio';

export function urlRedirectOAuth() {
  return appUrl(OAUTH_REDIRECT_PATH);
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: urlRedirectOAuth(),
      queryParams: { access_type: 'offline', prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export function isLoginSocial(user: User | null | undefined): boolean {
  if (!user) return false;
  const provider = user.app_metadata?.provider;
  return !!provider && provider !== 'email';
}

export function nomeExibicaoDoUsuario(user: User): string {
  const meta = user.user_metadata ?? {};
  return (
    meta.nome_completo ||
    meta.full_name ||
    meta.name ||
    user.email?.split('@')[0] ||
    'Meu Projeto'
  );
}
