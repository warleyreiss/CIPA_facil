import { useState, useRef, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { FloatLabel } from 'primereact/floatlabel';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Message } from 'primereact/message';
import { cn as classNames } from '../../lib/cn';
import { useProjeto } from '../../contexts/ProjetoContext';
import { supabase } from '../../lib/supabaseClient';
import { limparProjetoPersistido } from '../../lib/storageService';

export default function DeletarProjeto() {
  const { projetoId, projetoNome, assinatura } = useProjeto();
  const [confirmacaoNome, setConfirmacaoNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [validando, setValidando] = useState(true);
  const [totalProjetos, setTotalProjetos] = useState<number | null>(null);
  const toast = useRef<Toast>(null);

  const nomeValido = confirmacaoNome.trim() === projetoNome;
  const isUnicoProjeto = totalProjetos === 1;

  useEffect(() => {
    const checarQuantidadeProjetos = async () => {
      if (!assinatura?.id) return;
      setValidando(true);
      try {
        const { count, error } = await supabase
          .from('projetos')
          .select('*', { count: 'exact', head: true })
          .eq('assinatura_id', assinatura.id)
          .eq('status', true);
        if (!error && count !== null) setTotalProjetos(count);
      } catch (err) { console.error('Erro ao validar quantidade de projetos:', err); }
      finally { setValidando(false); }
    };
    checarQuantidadeProjetos();
  }, [assinatura?.id]);

  const handleInativarProjeto = async () => {
    if (!nomeValido || !projetoId || !assinatura?.id || isUnicoProjeto) return;
    setLoading(true);
    try {
      const { error: errorMembros } = await supabase.from('membro_projetos').update({ status: false }).eq('projeto_id', projetoId).eq('assinatura_id', assinatura.id);
      if (errorMembros) throw errorMembros;
      const { error: errorProjeto } = await supabase.from('projetos').update({ status: false }).eq('id', projetoId).eq('assinatura_id', assinatura.id);
      if (errorProjeto) throw errorProjeto;

      toast.current?.show({ severity: 'success', summary: 'Sucesso', detail: 'Projeto inativado com sucesso! Redirecionando...', life: 2000 });
      limparProjetoPersistido();
      // Sem projeto ativo → ProtectedRoute abre seleção obrigatória
      setTimeout(() => { window.location.href = '/configurar-projeto'; }, 1000);
    } catch (error: any) {
      console.error('Erro ao inativar projeto:', error);
      toast.current?.show({ severity: 'error', summary: 'Erro', detail: 'Não foi possível excluir o projeto. Tente novamente.' });
      setLoading(false);
    }
  };

  if (!projetoId) {
    return <p className="text-sm text-color-secondary">Nenhum projeto ativo selecionado para exclusão.</p>;
  }

  return (
    <>
      <Toast ref={toast} />

      <p className="config-lead">
        Projeto alvo: <strong>{projetoNome}</strong>. Ao confirmar, este projeto e os históricos
        vinculados serão{' '}
        <span style={{ color: 'var(--danger)', fontWeight: 650 }}>inativados imediatamente</span>.
        A assinatura permanece ativa.
      </p>

      {validando ? (
        <div className="config-lead" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="pi pi-spin pi-spinner" aria-hidden /> Verificando se a exclusão é permitida…
        </div>
      ) : isUnicoProjeto ? (
        <Message
          severity="warn"
          className="mb-3 w-full"
          text="Bloqueado: este é o único projeto da assinatura. Crie outro projeto antes de inativar este — ou use o card Excluir assinatura, se for o caso."
        />
      ) : null}

      <div
        className={classNames(
          'config-danger-box',
          isUnicoProjeto && 'config-danger-box--muted'
        )}
      >
        <small
          className="config-danger-box__label"
          style={isUnicoProjeto ? { color: 'var(--text-3)' } : undefined}
        >
          Digite o nome exato do projeto para confirmar:
        </small>
        <code className="config-danger-box__code">{projetoNome}</code>
        <FloatLabel>
          <InputText
            id="confirmacao"
            value={confirmacaoNome}
            onChange={(e) => setConfirmacaoNome(e.target.value)}
            className={classNames('w-full', {
              'p-invalid': confirmacaoNome && !nomeValido && !isUnicoProjeto,
            })}
            disabled={loading || validando || isUnicoProjeto}
            autoComplete="off"
          />
          <label htmlFor="confirmacao">Nome do projeto</label>
        </FloatLabel>
        {confirmacaoNome && !nomeValido && !isUnicoProjeto && (
          <small className="p-error">O nome digitado não corresponde ao projeto ativo.</small>
        )}
      </div>

      <div className="config-actions config-actions--end">
        <Button
          label={loading ? 'Inativando…' : 'Inativar este projeto'}
          icon="pi pi-trash"
          severity="danger"
          outlined
          disabled={!nomeValido || loading || validando || isUnicoProjeto}
          loading={loading}
          onClick={() => void handleInativarProjeto()}
        />
      </div>
    </>
  );
}
