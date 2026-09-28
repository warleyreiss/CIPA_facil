import { createClient } from '@supabase/supabase-js';
import { tentarReportarErroRequisicao } from './alertaManutencaoService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variáveis de ambiente do Supabase não encontradas.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
      const method = options?.method || 'GET';
      const urlStr = String(url);

      try {
        const response = await fetch(url, options);
        const responseClone = response.clone();

        responseClone
          .json()
          .then((data) => {
            if (!response.ok) {
              // Evita inundar o console com 404 esperados (schema/storage)
              if (response.status === 404) {
                if (import.meta.env.DEV) {
                  console.warn(`[Supabase ${response.status}]`, urlStr.split('?')[0], data);
                }
              } else {
                console.error(`❌ [Supabase ERROR ${response.status}]:`, data);
              }
              tentarReportarErroRequisicao(urlStr, response.status, method, data);
            }
          })
          .catch(() => {
            if (!response.ok) {
              if (response.status !== 404 || import.meta.env.DEV) {
                console.error(`❌ [Supabase ERROR ${response.status}]: Resposta não é JSON`);
              }
              tentarReportarErroRequisicao(urlStr, response.status, method, {
                message: `Resposta não-JSON (HTTP ${response.status})`,
              });
            }
          });

        return response;
      } catch (erroRede) {
        console.error('❌ [Supabase NETWORK ERROR]:', erroRede);
        tentarReportarErroRequisicao(urlStr, 0, method, erroRede);
        throw erroRede;
      }
    },
  },
});
