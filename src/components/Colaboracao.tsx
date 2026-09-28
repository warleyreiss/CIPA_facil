import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Button } from 'primereact/button';
import { BRAND } from '../lib/brandAssets';
import { EMPRESA } from '../config/empresa';
import { montarPixCopiaECola } from '../lib/pixPayload';
import { useToast } from './ui/Toast';
import '../assets/css/especificos/doacao.css';

const CHAVE_PIX = EMPRESA.emailDoacao;

const IMPACTOS = [
  {
    icon: 'pi-shield',
    titulo: 'Segurança',
    texto: 'Mandato, reuniões e o processo eleitoral no ar.',
  },
  {
    icon: 'pi-bolt',
    titulo: 'Evolução',
    texto: 'Melhorias contínuas na gestão da CIPA.',
  },
  {
    icon: 'pi-heart',
    titulo: 'Plano gratuito',
    texto: 'Mantém o Iniciante acessível a todos.',
  },
] as const;

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = texto;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function Colaboracao() {
  const navigate = useNavigate();
  const toast = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrErro, setQrErro] = useState(false);

  const payloadPix = useMemo(
    () =>
      montarPixCopiaECola({
        chave: CHAVE_PIX,
        nomeRecebedor: EMPRESA.titularLegal,
        cidade: EMPRESA.cidade,
        txid: 'DOACAO',
      }),
    []
  );

  useEffect(() => {
    let cancelado = false;
    setQrErro(false);
    setQrDataUrl(null);

    QRCode.toDataURL(payloadPix, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1e3a8a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelado) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelado) setQrErro(true);
      });

    return () => {
      cancelado = true;
    };
  }, [payloadPix]);

  const copiarChave = async () => {
    const ok = await copiarTexto(CHAVE_PIX);
    toast.show({
      severity: ok ? 'success' : 'error',
      summary: ok ? 'Chave copiada' : 'Não foi possível copiar',
      detail: ok ? 'Cole a chave PIX no app do seu banco.' : 'Copie manualmente o e-mail exibido.',
      life: 3500,
    });
  };

  const copiarCodigo = async () => {
    const ok = await copiarTexto(payloadPix);
    toast.show({
      severity: ok ? 'success' : 'error',
      summary: ok ? 'PIX copia e cola' : 'Não foi possível copiar',
      detail: ok ? 'Abra o app do banco e cole o código PIX.' : 'Tente novamente ou use a chave e-mail.',
      life: 4000,
    });
  };

  return (
    <div className="doacao-page">
      <header className="doacao-hero">
        <div className="doacao-hero__mesh" aria-hidden />
        <div className="doacao-hero__inner">
          <div className="doacao-hero__copy">
            <span className="doacao-badge">
              <i className="pi pi-heart-fill" aria-hidden />
              Apoie o CIPA Fácil
            </span>
            <h1 className="doacao-hero__title">Sua doação mantém a gestão da CIPA em movimento</h1>
            <p className="doacao-hero__subtitle">
              Contribua via PIX no valor que quiser — ajuda a sustentar o plano gratuito e o produto.
            </p>
          </div>
          <div className="doacao-hero__brand">
            <img src={BRAND.logomarca} alt={BRAND.name} />
          </div>
        </div>
      </header>

      <div className="doacao-layout">
        <section className="doacao-panel doacao-panel--impact" aria-label="Por que doar">
          <h2 className="doacao-panel__title">Para onde vai o seu apoio</h2>
          <ul className="doacao-impact">
            {IMPACTOS.map((item) => (
              <li key={item.titulo}>
                <span className="doacao-impact__icon" aria-hidden>
                  <i className={`pi ${item.icon}`} />
                </span>
                <div className="doacao-impact__text">
                  <strong>{item.titulo}</strong>
                  <span>{item.texto}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="doacao-trust">
            <span className="doacao-trust__pill">
              <i className="pi pi-building" aria-hidden />
              {EMPRESA.marca}™
            </span>
            <span className="doacao-trust__pill">
              <i className="pi pi-id-card" aria-hidden />
              CNPJ {EMPRESA.cnpj}
            </span>
          </div>
        </section>

        <section className="doacao-panel doacao-panel--pix" aria-label="Doar via PIX">
          <h2 className="doacao-panel__title">Doe com PIX</h2>
          <p className="doacao-panel__desc">Escaneie o QR ou copie a chave — o valor é você quem define no banco.</p>

          <div className="doacao-qr-wrap">
            <div className="doacao-qr" aria-live="polite">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code PIX para doação" />
              ) : qrErro ? (
                <div className="doacao-qr__error">Use a chave ou o copia e cola.</div>
              ) : (
                <div className="doacao-qr__loading">
                  <i className="pi pi-spin pi-spinner" aria-hidden />
                </div>
              )}
            </div>

            <div className="doacao-chave">
              <p className="doacao-chave__label">Chave PIX · E-mail</p>
              <p className="doacao-chave__value">{CHAVE_PIX}</p>
            </div>

            <div className="doacao-actions">
              <Button type="button" label="Copiar chave" icon="pi pi-copy" onClick={copiarChave} />
              <Button
                type="button"
                label="Copia e cola"
                icon="pi pi-qrcode"
                outlined
                onClick={copiarCodigo}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="doacao-foot">
        <Button
          type="button"
          label="Voltar"
          icon="pi pi-arrow-left"
          text
          severity="secondary"
          onClick={() => navigate(-1)}
        />
        <p className="doacao-foot__thanks">Obrigado por fortalecer a gestão da CIPA conosco.</p>
      </div>
    </div>
  );
}
