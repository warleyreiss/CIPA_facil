import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useProjeto } from '../../contexts/ProjetoContext';
import { stripeService } from '../../lib/stripeService';
import { isPlanoGratuito } from '../../lib/recursosPlano';

export default function ControleFinanceiro() {
  const contexto = useProjeto();
  const assinatura = contexto?.assinatura;
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const [loading, setLoading] = useState(false);

  const isPlanoGratuitoAtivo = isPlanoGratuito(assinatura?.plano_tipo);

  const handleAbrirPortal = async () => {
    if (!assinatura?.id) return;
    setLoading(true);
    try {
      await stripeService.redirectToCustomerPortal(assinatura.id);
    } catch (error: any) {
      console.error(error);
      toast.current?.show({
        severity: 'error',
        summary: 'Erro',
        detail: 'Não foi possível redirecionar para o portal de faturamento.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast ref={toast} />

      {isPlanoGratuitoAtivo ? (
        <div className="config-callout">
          <div className="config-callout__main">
            <span className="config-callout__icon" aria-hidden>
              <i className="pi pi-verified" />
            </span>
            <div>
              <p className="config-callout__title">Plano Iniciante (gratuito)</p>
              <p className="config-callout__text">
                Sua conta não possui cobranças ativas. Faça upgrade para acessar o histórico
                financeiro e liberar todos os recursos.
              </p>
            </div>
          </div>
          <Button
            label="Fazer upgrade"
            icon="pi pi-star-fill"
            severity="success"
            onClick={() => navigate('/upgrade')}
          />
        </div>
      ) : (
        <>
          <div className="config-callout">
            <div className="config-callout__main">
              <span className="config-callout__icon" aria-hidden>
                <i className="pi pi-credit-card" />
              </span>
              <div>
                <p className="config-callout__title">Portal de autogestão (Stripe)</p>
                <p className="config-callout__text">
                  Trocas de cartão, faturas e regularizações ocorrem no ambiente criptografado da
                  operadora.
                </p>
              </div>
            </div>
            <Button
              label="Gerenciar faturamento"
              icon="pi pi-external-link"
              iconPos="right"
              loading={loading}
              onClick={() => void handleAbrirPortal()}
            />
          </div>

          <ul className="config-checklist">
            <li>
              <i className="pi pi-check-circle" aria-hidden /> Alterar ou adicionar cartões
            </li>
            <li>
              <i className="pi pi-check-circle" aria-hidden /> Consultar e baixar PDFs de faturas
            </li>
            <li>
              <i className="pi pi-check-circle" aria-hidden /> Regularizar pagamentos recusados
            </li>
          </ul>
        </>
      )}
    </>
  );
}
