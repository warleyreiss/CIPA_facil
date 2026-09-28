import { supabase } from './supabaseClient';
import { marcarWizardImportacaoPendente, marcarConfigTourPendente } from './storageService';
import { cacheGetOrFetch, cacheInvalidatePrefix, CACHE_TTL } from './queryCache';

export function invalidarCacheProjeto(projetoId?: string): void {
  if (projetoId) cacheInvalidatePrefix(`projeto:${projetoId}`);
  else cacheInvalidatePrefix('projeto:');
}

export const projetoService = {
  async getDados(projetoId: string) {
    const { data, error } = await supabase
      .from('projetos')
      .select('*')
      .eq('id', projetoId)
      .maybeSingle(); 

    if (error) throw error;
    return data;
  },

  /** Flags operacionais (alertas / dashboard) — select estreito + cache curto. */
  async getFlagsOperacionais(projetoId: string) {
    const chave = `projeto:${projetoId}:flags`;
    return cacheGetOrFetch(chave, CACHE_TTL.projeto, async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('id')
        .eq('id', projetoId)
        .maybeSingle();

      if (error) throw error;
      return data;
    });
  },

  async updateDados(projetoId: string, dados: any) {
    const { error } = await supabase
      .from('projetos')
      .update(dados)
      .eq('id', projetoId);
        
    if (error) throw error;
    invalidarCacheProjeto(projetoId);
    return true;
  },

  /**
   * Grava o projeto pulando colunas opcionais que ainda não existem no banco.
   * As colunas em `obrigatorias` nunca são puladas: se faltarem, o erro sobe.
   */
  async salvarDadosCipa(projetoId: string, dados: Record<string, unknown>, obrigatorias: string[]) {
    let atual = { ...dados };
    const puladas: string[] = [];
    for (let tentativa = 0; tentativa <= Object.keys(dados).length; tentativa += 1) {
      const { error } = await supabase.from('projetos').update(atual).eq('id', projetoId);
      if (!error) {
        invalidarCacheProjeto(projetoId);
        return { puladas };
      }
      const mensagem = error.message || '';
      const coluna = /column|schema cache/i.test(mensagem) ? mensagem.match(/'([a-z0-9_]+)'/i)?.[1] : undefined;
      if (!coluna || !(coluna in atual)) throw error;
      if (obrigatorias.includes(coluna)) {
        throw new Error(
          `A coluna ${coluna} não existe na tabela projetos. Aplique as migrations do dimensionamento da CIPA no banco.`,
        );
      }
      const { [coluna]: _removida, ...resto } = atual;
      void _removida;
      atual = resto;
      puladas.push(coluna);
    }
    throw new Error('Não foi possível salvar os dados do projeto.');
  },

  async uploadLogo(projetoId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${projetoId}/logo.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('logos')
      .upload(fileName, file, { upsert: true });
        
    if (error) throw error;
    
    const { data } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);
        
    return data.publicUrl;
  },

  /**
   * Consulta e-mail na equipe (usuarios + vínculos da assinatura).
   * Usado no convite para orientar ações: reenviar / reativar / bloquear.
   */
  async consultarEmailEquipe(email: string, assinaturaId: string) {
    const emailNorm = email.trim().toLowerCase();
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, email, nome_completo, status_cadastro')
      .eq('email', emailNorm)
      .maybeSingle();

    if (error) throw error;
    if (!usuario) {
      return { existe: false as const };
    }

    const { data: vinculos, error: errVinculos } = await supabase
      .from('membro_projetos')
      .select('id, projeto_id, funcao, status')
      .eq('usuario_id', usuario.id)
      .eq('assinatura_id', assinaturaId);

    if (errVinculos) throw errVinculos;

    const ativos = (vinculos || []).filter((v) => v.status === true);
    const inativos = (vinculos || []).filter((v) => v.status !== true);

    return {
      existe: true as const,
      usuario,
      temVinculoAtivo: ativos.length > 0,
      temVinculoInativo: inativos.length > 0,
      vinculosAtivos: ativos,
      vinculosInativos: inativos,
      pendente: usuario.status_cadastro === 'PENDENTE',
    };
  },

  async verificarEmailExiste(email: string) {
    const { count } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('email', email.trim().toLowerCase());
    return (count ?? 0) > 0;
  },

  async getColaboradores(assinaturaId: string) {
    try {
      const { data, error } = await supabase
        .from('membro_projetos')
        .select(`
          id,
          usuario_id,
          projeto_id,
          funcao,
          status,
          usuarios (
            id,
            nome_completo,
            email,
            status_cadastro
          ),
          projetos (
            id,
            nome
          )
        `)
        .eq('assinatura_id', assinaturaId)
        .eq('status', true);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar colaboradores no service:', err);
      return [];
    }
  },

  async inativarColaborador(usuarioId: string, assinaturaId: string) {
    const { error } = await supabase
      .from('membro_projetos')
      .update({ status: false })
      .eq('usuario_id', usuarioId)
      .eq('assinatura_id', assinaturaId);

    if (error) throw error;
    return true;
  },

  /** Reativa vínculos inativos e/ou cria vínculos nos projetos informados. */
  async reativarOuVincularColaborador(opts: {
    usuarioId: string;
    assinaturaId: string;
    projetoIds: string[];
    funcao: string;
  }) {
    const { usuarioId, assinaturaId, projetoIds, funcao } = opts;
    if (!projetoIds.length) throw new Error('Selecione ao menos um projeto.');

    const { data: existentes, error: errExist } = await supabase
      .from('membro_projetos')
      .select('id, projeto_id, status')
      .eq('usuario_id', usuarioId)
      .eq('assinatura_id', assinaturaId);

    if (errExist) throw errExist;

    const porProjeto = new Map((existentes || []).map((v) => [v.projeto_id, v]));
    const paraReativar: string[] = [];
    const paraInserir: { assinatura_id: string; usuario_id: string; projeto_id: string; funcao: string; status: boolean }[] = [];

    for (const projetoId of projetoIds) {
      const atual = porProjeto.get(projetoId);
      if (!atual) {
        paraInserir.push({
          assinatura_id: assinaturaId,
          usuario_id: usuarioId,
          projeto_id: projetoId,
          funcao,
          status: true,
        });
      } else if (atual.status !== true) {
        paraReativar.push(atual.id);
      }
    }

    if (paraReativar.length) {
      const { error } = await supabase
        .from('membro_projetos')
        .update({ status: true, funcao })
        .in('id', paraReativar);
      if (error) throw error;
    }

    if (paraInserir.length) {
      const { error } = await supabase.from('membro_projetos').insert(paraInserir);
      if (error) throw error;
    }

    // Atualiza função nos já ativos selecionados
    const ativosSelecionados = (existentes || [])
      .filter((v) => v.status === true && projetoIds.includes(v.projeto_id))
      .map((v) => v.id);
    if (ativosSelecionados.length) {
      const { error } = await supabase
        .from('membro_projetos')
        .update({ funcao })
        .in('id', ativosSelecionados);
      if (error) throw error;
    }

    return true;
  },
  async criarProjetoAvulso(nome: string, assinaturaId: string) {
    const { data, error } = await supabase
      .rpc('criar_projeto_avulso', {
        p_nome: nome,
        p_assinatura_id: assinaturaId
      });

    if (error) {
      console.error('Erro RPC criar_projeto_avulso:', error.message);
      throw error;
    }

    const projetoId =
      (typeof data === 'string' && data) ||
      (data && typeof data === 'object'
        ? (data as { id?: string; projeto_id?: string }).id ??
          (data as { id?: string; projeto_id?: string }).projeto_id
        : null);

    if (typeof projetoId === 'string' && projetoId) {
      marcarWizardImportacaoPendente(projetoId);
      marcarConfigTourPendente(projetoId);
    }

    return data; // Retorna o objeto do projeto em formato JSON
  },

  async listarHistoricoAlteracoes(projetoId: string): Promise<HistoricoAlteracaoProjetoItem[]> {
    const { data, error } = await supabase
      .from('historico_alteracao_projetos')
      .select(`
        id,
        projeto_id,
        alterado_por,
        campos_alterados,
        alteracoes,
        created_at,
        usuarios:alterado_por (
          id,
          nome_completo,
          email
        )
      `)
      .eq('projeto_id', projetoId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data || []).map((row: any) => {
      const usuario = Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios;
      return {
        id: row.id,
        projeto_id: row.projeto_id,
        alterado_por: row.alterado_por,
        campos_alterados: row.campos_alterados || [],
        alteracoes: (row.alteracoes || {}) as Record<string, { antes: unknown; depois: unknown }>,
        created_at: row.created_at,
        alterado_por_nome: usuario?.nome_completo || usuario?.email || null,
      };
    });
  },
};

export interface HistoricoAlteracaoProjetoItem {
  id: string;
  projeto_id: string;
  alterado_por: string | null;
  campos_alterados: string[];
  alteracoes: Record<string, { antes: unknown; depois: unknown }>;
  created_at: string;
  alterado_por_nome: string | null;
}