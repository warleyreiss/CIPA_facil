import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';

import BtnVoltarTopo from './components/BtnVoltarTopo';
import Cabecalho from './components/Cabecalho';
import ScrollSpy from './components/ScrollSpy';
import CtaBand from './components/CtaBand';
import PassoApasso from './components/PassoApasso';
import Home from './components/Home';
import Porque from './components/Porque';
import Recursos from './components/Recursos';
import ProvaSocial from './components/ProvaSocial';
import PlanosLanding from './components/PlanosLanding';
import Rodape from './components/Rodape';
import FormCadastroLogin from './components/FormCadastroLogin';
import ModalIndicacaoParceiro from './components/ModalIndicacaoParceiro';
import AdSenseGate from '../../components/AdSenseGate';
import {
  limparCodigoParceiro,
  obterCodigoParceiro,
} from '../../lib/parceiroStorage';
import {
  registrarIndicacaoSeValida,
  revalidarIndicacaoPendente,
} from '../../lib/parceiroService';

import './components/css/landingPage.css';

const LandingPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [indicacaoOpen, setIndicacaoOpen] = useState(false);
  const [codigoTentado, setCodigoTentado] = useState('');
  const [abrirCadastroAposIndicacao, setAbrirCadastroAposIndicacao] = useState(false);
  const [validandoCadastro, setValidandoCadastro] = useState(false);
  const [bannerIndicacao, setBannerIndicacao] = useState<string | null>(null);
  const bannerDismissedRef = useRef(false);

  const mostrarBannerIndicacao = (msg: string) => {
    if (bannerDismissedRef.current) return;
    setBannerIndicacao(msg);
  };

  const fecharBannerIndicacao = () => {
    bannerDismissedRef.current = true;
    setBannerIndicacao(null);
  };

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-in-out',
    });
  }, []);

  /** Valida código da URL / sessão assim que a home carrega. */
  useEffect(() => {
    let alive = true;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('indicacao');
      const codigoQuery = params.get('codigo') || params.get('ref') || params.get('parceiro');
      const nomeParceiro = params.get('parceiro');

      const limparQueryIndicacao = () => {
        params.delete('indicacao');
        params.delete('codigo');
        params.delete('ref');
        params.delete('parceiro');
        const qs = params.toString();
        window.history.replaceState({}, '', qs ? `/?${qs}` : '/');
      };

      if (status === 'falha') {
        limparCodigoParceiro();
        if (!alive) return;
        setCodigoTentado(codigoQuery || '');
        setIndicacaoOpen(true);
        limparQueryIndicacao();
        return;
      }

      if (status === 'ok') {
        if (!alive) return;
        mostrarBannerIndicacao(
          nomeParceiro
            ? `Indicação ativa: ${decodeURIComponent(nomeParceiro)}. Ao se cadastrar, este fornecedor será vinculado ao seu projeto.`
            : 'Indicação de fornecedor ativa. Ao se cadastrar, o parceiro será vinculado ao seu projeto.'
        );
        limparQueryIndicacao();
        return;
      }

      if (codigoQuery && status !== 'ok') {
        const result = await registrarIndicacaoSeValida(codigoQuery);
        if (!alive) return;
        limparQueryIndicacao();
        if (result.ok) {
          mostrarBannerIndicacao(
            `Indicação ativa: ${result.parceiro.razao_social}. Ao se cadastrar, este fornecedor será vinculado ao seu projeto.`
          );
        } else {
          setCodigoTentado(result.codigoTentado);
          setIndicacaoOpen(true);
        }
        return;
      }

      // Sessão com código antigo: revalida em background
      const pendente = await revalidarIndicacaoPendente();
      if (!alive || !pendente) return;
      if (pendente.ok) {
        mostrarBannerIndicacao(
          `Indicação ativa: ${pendente.parceiro.razao_social}. Ao se cadastrar, este fornecedor será vinculado ao seu projeto.`
        );
      } else {
        setCodigoTentado(pendente.codigoTentado);
        setIndicacaoOpen(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const abrirCadastro = () => setIsModalOpen(true);

  /** Antes do cadastro: se houver código, revalida; se inválido, modal em vez do wizard. */
  const handleOpenModal = async (_mode: 'login' | 'cadastro') => {
    const codigo = obterCodigoParceiro();
    if (!codigo) {
      abrirCadastro();
      return;
    }

    setValidandoCadastro(true);
    try {
      const result = await revalidarIndicacaoPendente();
      if (result && !result.ok) {
        setCodigoTentado(result.codigoTentado || codigo);
        setAbrirCadastroAposIndicacao(true);
        setIndicacaoOpen(true);
        return;
      }
      if (result?.ok) {
        mostrarBannerIndicacao(
          `Indicação ativa: ${result.parceiro.razao_social}. Ao se cadastrar, este fornecedor será vinculado ao seu projeto.`
        );
      }
      abrirCadastro();
    } finally {
      setValidandoCadastro(false);
    }
  };

  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const bannerEl =
    bannerIndicacao && typeof document !== 'undefined'
      ? createPortal(
          <div className="indicacao-banner" role="status">
            <span>{bannerIndicacao}</span>
            <button
              type="button"
              className="indicacao-banner__close"
              aria-label="Fechar aviso"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fecharBannerIndicacao();
              }}
            >
              ×
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <AdSenseGate allow />
      <div className="toast-container" id="toastContainer"></div>

      {bannerEl}

      <ScrollSpy onScrollToSection={handleScrollToSection} />
      <BtnVoltarTopo />

      <div className="landing-hero-screen">
        <Cabecalho
          onOpenRegister={() => handleOpenModal('cadastro')}
          onOpenLogin={() => handleOpenModal('login')}
          onScrollToSection={handleScrollToSection}
        />

        <Home
          onOpenModal={() => handleOpenModal('cadastro')}
          onScrollToSection={handleScrollToSection}
        />
      </div>

      <ProvaSocial />
      <Porque />
      <Recursos />
      <PlanosLanding onOpenModal={() => handleOpenModal('cadastro')} />

      <CtaBand onOpenModal={() => handleOpenModal('cadastro')} />

      <PassoApasso />

      <Rodape
        onOpenModal={() => handleOpenModal('cadastro')}
        onScrollToSection={handleScrollToSection}
      />

      <FormCadastroLogin
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <ModalIndicacaoParceiro
        open={indicacaoOpen}
        codigoTentado={codigoTentado}
        onClose={() => {
          setIndicacaoOpen(false);
          setAbrirCadastroAposIndicacao(false);
        }}
        onContinuarSemIndicacao={() => {
          fecharBannerIndicacao();
          setIndicacaoOpen(false);
          if (abrirCadastroAposIndicacao) {
            setAbrirCadastroAposIndicacao(false);
            abrirCadastro();
          }
        }}
        onIndicacaoCorrigida={(razao) => {
          bannerDismissedRef.current = false;
          mostrarBannerIndicacao(
            `Indicação ativa: ${razao}. Ao se cadastrar, este fornecedor será vinculado ao seu projeto.`
          );
          setIndicacaoOpen(false);
          if (abrirCadastroAposIndicacao) {
            setAbrirCadastroAposIndicacao(false);
            abrirCadastro();
          }
        }}
      />

      {validandoCadastro ? (
        <div className="indicacao-validando" role="status" aria-live="polite">
          Verificando indicação do fornecedor…
        </div>
      ) : null}
    </>
  );
};

export default LandingPage;
