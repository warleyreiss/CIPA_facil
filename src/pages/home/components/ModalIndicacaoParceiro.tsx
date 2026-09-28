import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { BRAND } from '../../../lib/brandAssets';
import { limparCodigoParceiro } from '../../../lib/parceiroStorage';
import { registrarIndicacaoSeValida } from '../../../lib/parceiroService';
import './css/modal-indicacao-parceiro.css';

type Props = {
  open: boolean;
  codigoTentado?: string;
  /** Se true, após resolver abre o cadastro. */
  abrirCadastroAoResolver?: boolean;
  onClose: () => void;
  onContinuarSemIndicacao: () => void;
  onIndicacaoCorrigida: (razaoSocial: string) => void;
};

/**
 * Modal quando o código de indicação da URL/sessão não existe mais ou está inativo.
 */
export default function ModalIndicacaoParceiro({
  open,
  codigoTentado = '',
  onClose,
  onContinuarSemIndicacao,
  onIndicacaoCorrigida,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const [novoCodigo, setNovoCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNovoCodigo('');
    setErro('');
    setBusy(false);
  }, [open, codigoTentado]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  async function handleValidarNovo(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErro('');
    try {
      const result = await registrarIndicacaoSeValida(novoCodigo);
      if (!result.ok) {
        setErro(
          result.motivo === 'formato'
            ? 'Código em formato inválido. Use letras, números, _ ou - (2 a 40 caracteres).'
            : 'Não encontramos um fornecedor parceiro ativo com este código. Confira com a loja ou continue sem indicação.'
        );
        return;
      }
      onIndicacaoCorrigida(result.parceiro.razao_social);
    } finally {
      setBusy(false);
    }
  }

  function handleSemIndicacao() {
    limparCodigoParceiro();
    onContinuarSemIndicacao();
  }

  return createPortal(
    <div className="indicacao-modal" role="presentation" onClick={onClose}>
      <div
        className="indicacao-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="indicacao-modal__accent" aria-hidden />

        <header className="indicacao-modal__head">
          <img src={BRAND.logotipo} alt="" className="indicacao-modal__logo" width={40} height={40} />
          <div>
            <p className="indicacao-modal__eyebrow">Indicação de fornecedor</p>
            <h2 id={titleId} className="indicacao-modal__title">
              Este código não está mais disponível
            </h2>
          </div>
        </header>

        <div id={descId} className="indicacao-modal__body">
          <p>
            O link ou código de indicação
            {codigoTentado ? (
              <>
                {' '}
                <strong className="indicacao-modal__code">{codigoTentado}</strong>
              </>
            ) : null}{' '}
            não corresponde a um fornecedor parceiro ativo no CIPA Fácil.
          </p>
          <p>
            Isso pode acontecer se o <strong>cadastro do fornecedor foi alterado</strong>, o código
            mudou, a parceria foi desativada ou o link do cartão de visita está desatualizado.
          </p>
          <p>
            Você pode informar um <strong>código novo</strong> (peça à loja) ou{' '}
            <strong>continuar o cadastro sem indicação</strong> — nesse caso nenhum fornecedor será
            vinculado automaticamente ao seu projeto.
          </p>
        </div>

        <form className="indicacao-modal__form" onSubmit={handleValidarNovo}>
          <label className="indicacao-modal__label" htmlFor="indicacao-novo-codigo">
            Novo código de indicação
          </label>
          <div className="indicacao-modal__row">
            <input
              id="indicacao-novo-codigo"
              className="indicacao-modal__input"
              value={novoCodigo}
              onChange={(e) => setNovoCodigo(e.target.value.toLowerCase())}
              placeholder="ex.: loja01"
              autoComplete="off"
              maxLength={40}
              disabled={busy}
            />
            <button type="submit" className="indicacao-modal__btn indicacao-modal__btn--primary" disabled={busy || !novoCodigo.trim()}>
              {busy ? 'Validando…' : 'Validar código'}
            </button>
          </div>
          {erro ? <p className="indicacao-modal__erro" role="alert">{erro}</p> : null}
        </form>

        <footer className="indicacao-modal__footer">
          <button type="button" className="indicacao-modal__btn indicacao-modal__btn--ghost" onClick={onClose} disabled={busy}>
            Fechar
          </button>
          <button
            type="button"
            className="indicacao-modal__btn indicacao-modal__btn--secondary"
            onClick={handleSemIndicacao}
            disabled={busy}
          >
            Continuar sem indicação
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
