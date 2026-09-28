import { supabase } from './supabaseClient';
import { mesclarPendingRegistration } from './pendingRegistration';
import { appOrigin, appUrl } from './appUrl';

async function redirecionarCheckoutResponse(data: { mode?: string; url?: string; redirectUrl?: string } | null) {
  if (data?.mode === 'updated' && data.redirectUrl) {
    window.location.href = data.redirectUrl;
    return;
  }
  if (data?.mode === 'updated') {
    window.location.href = appUrl('/sucesso-upgrade');
    return;
  }
  if (data?.url) {
    window.location.href = data.url;
    return;
  }
  throw new Error('Resposta de checkout inválida.');
}

export const stripeService = {
  /**
   * Cadastro pago: a edge reserva a assinatura (service role) — cliente não INSERT mais.
   */
  async createCheckoutSession(
    priceId: string,
    tipoCadastro: 'AUTONOMO' | 'EMPRESARIAL',
    userEmail?: string,
    options?: { continuarComGoogle?: boolean },
  ) {
    const email = String(userEmail || '').trim();
    if (!email || !email.includes('@')) {
      throw new Error('Informe um e-mail válido antes do pagamento.');
    }

    const qs = new URLSearchParams();
    if (options?.continuarComGoogle) qs.set('auth', 'google');
    const successPath = qs.toString() ? `/login?${qs.toString()}` : '/login';

    const { data, error: edgeError } = await supabase.functions.invoke('create-checkout', {
      body: {
        priceId,
        userEmail: email,
        tipoCadastro,
        reservarSignup: true,
        successUrl: `${appOrigin()}${successPath}`,
        cancelUrl: `${appOrigin()}/?checkout=cancelado`,
      },
    });

    if (edgeError) {
      const detalhe =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error?: string }).error || '')
          : '';
      throw new Error(detalhe || edgeError.message || 'Erro ao processar checkout com Stripe.');
    }

    const assinaturaId = (data as { assinaturaId?: string } | null)?.assinaturaId;
    if (assinaturaId) {
      mesclarPendingRegistration({ assinatura_id: assinaturaId });
    }

    await redirecionarCheckoutResponse(data);
  },

  async createFreeSubscription(priceId: string, tipoCadastro: 'AUTONOMO' | 'EMPRESARIAL', userEmail?: string) {
    const email = String(userEmail || '').trim();
    if (!email.includes('@')) {
      throw new Error('Informe um e-mail válido para ativar o plano gratuito.');
    }
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        priceId,
        tipoCadastro,
        userEmail: email,
        reservarSignup: true,
        planoGratuito: true,
      },
    });
    if (error || !(data as { assinaturaId?: string })?.assinaturaId) {
      throw new Error(
        (data as { error?: string })?.error ||
          error?.message ||
          'Não foi possível ativar o plano gratuito. Tente novamente.',
      );
    }
    return { id: (data as { assinaturaId: string }).assinaturaId };
  },

  async invokeCheckoutAutenticado(body: {
    priceId: string;
    assinaturaId: string;
    userId?: string;
    userEmail?: string;
  }) {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        ...body,
        successUrl: appUrl('/sucesso-upgrade'),
        cancelUrl: appUrl('/upgrade?cancelado=1'),
      },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    });

    if (error) {
      const msg =
        data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error
          ? String((data as { error: string }).error)
          : error.message || 'Erro ao processar checkout com Stripe.';
      throw new Error(msg);
    }
    return data;
  },

  async redirectToCustomerPortal(assinaturaId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error: edgeError } = await supabase.functions.invoke('create-portal-session-stripe', {
      body: {
        assinaturaId,
        returnUrl: appUrl('/configurar-projeto'),
      },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    });

    if (edgeError) throw new Error(edgeError.message || 'Erro ao gerar sessão do portal.');
    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error('URL do portal não foi retornada.');
    }
  },
};
