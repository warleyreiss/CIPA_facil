import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Rodape from './components/Rodape';
import FormCadastroLogin from './components/FormCadastroLogin';
import ModalIndicacaoParceiro from './components/ModalIndicacaoParceiro';
import { BRAND } from '../../lib/brandAssets';
import { limparCodigoParceiro, obterCodigoParceiro } from '../../lib/parceiroStorage';
import { registrarIndicacaoSeValida, revalidarIndicacaoPendente } from '../../lib/parceiroService';
import './components/css/landingPage.css';
import './components/css/nova-home.css';

const TRILHA = [
  { dia: 'D−60', nome: 'Abrir o processo', detalhe: 'Avisar o sindicato e publicar o edital.' },
  { dia: 'D−30', nome: 'Eleição', detalhe: 'Voto secreto, no horário de trabalho.' },
  { dia: 'Posse', nome: 'Nova gestão', detalhe: 'Treinamento antes da posse e ata assinada.' },
];

const PILARES = [
  {
    id: 'mandato',
    icone: 'pi-calendar',
    kicker: 'Mandato',
    titulo: 'A vigência não passa em branco',
    texto: 'A data de início e de fim da gestão fica visível. Sessenta dias antes do encerramento, a eleição entra na fila do que precisa ser feito.',
  },
  {
    id: 'rotina',
    icone: 'pi-users',
    kicker: 'Rotina',
    titulo: 'Reunião, membro e ata no mesmo lugar',
    texto: 'Titulares, suplentes e reservistas. Reuniões ordinárias com ata para editar e imprimir. Datas passadas podem ser registradas.',
  },
  {
    id: 'eleicao',
    icone: 'pi-flag',
    kicker: 'Eleição',
    titulo: 'O calendário da NR-05 já vem montado',
    texto: 'Cada etapa da eleição tem data, documento modelo e só libera perto do prazo. A apuração segue o quórum do primeiro, segundo e terceiro dia.',
  },
];

export default function NovaHome() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [indicacaoOpen, setIndicacaoOpen] = useState(false);
  const [codigoTentado, setCodigoTentado] = useState('');
  const [abrirCadastroAposIndicacao, setAbrirCadastroAposIndicacao] = useState(false);
  const [validandoCadastro, setValidandoCadastro] = useState(false);
  const [bannerIndicacao, setBannerIndicacao] = useState<string | null>(null);
  const bannerDismissedRef = useRef(false);
  const palcoRef = useRef<HTMLElement>(null);

  const mostrarBannerIndicacao = (msg: string) => {
    if (bannerDismissedRef.current) return;
    setBannerIndicacao(msg);
  };

  useEffect(() => {
    const raiz = palcoRef.current;
    if (!raiz) return;
    const itens = raiz.querySelectorAll<HTMLElement>('.nh-revela');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visto');
        });
      },
      { threshold: 0.18 },
    );
    itens.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

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
            : 'Indicação de fornecedor ativa. Ao se cadastrar, o parceiro será vinculado ao seu projeto.',
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
            `Indicação ativa: ${result.parceiro.razao_social}. Ao se cadastrar, este fornecedor será vinculado ao seu projeto.`,
          );
        } else {
          setCodigoTentado(result.codigoTentado);
          setIndicacaoOpen(true);
        }
        return;
      }
      const pendente = await revalidarIndicacaoPendente();
      if (!alive || !pendente) return;
      if (pendente.ok) {
        mostrarBannerIndicacao(
          `Indicação ativa: ${pendente.parceiro.razao_social}. Ao se cadastrar, este fornecedor será vinculado ao seu projeto.`,
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

  const handleOpenModal = async (mode: 'login' | 'cadastro') => {
    if (mode === 'login') {
      navigate('/login');
      return;
    }
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
      abrirCadastro();
    } finally {
      setValidandoCadastro(false);
    }
  };

  const irPara = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
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
              onClick={() => {
                bannerDismissedRef.current = true;
                setBannerIndicacao(null);
              }}
            >
              ×
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="home-cipa">
      {bannerEl}
      <header className="nh-topo">
        <button type="button" className="nh-topo__marca" onClick={() => irPara('home')}>
          <img src={BRAND.logotipo} alt="" />
          CIPA Fácil
        </button>
        <nav className="nh-topo__nav" aria-label="Seções">
          <button type="button" onClick={() => irPara('mandato')}>Mandato</button>
          <button type="button" onClick={() => irPara('rotina')}>Rotina</button>
          <button type="button" onClick={() => irPara('eleicao')}>Eleição</button>
        </nav>
        <div className="nh-topo__acoes">
          <button type="button" className="nh-btn nh-btn--topo" onClick={() => handleOpenModal('login')}>
            Já sou cadastrado
          </button>
          <button type="button" className="nh-btn nh-btn--cadastro" onClick={() => handleOpenModal('cadastro')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Começar grátis
          </button>
        </div>
      </header>
      <main ref={palcoRef}>
        <section className="nh-hero" id="home">
          <div className="nh-hero__glow" aria-hidden />
          <div className="nh-hero__grade" aria-hidden />
          <div className="nh-hero__miolo">
            <div className="nh-hero__texto">
              <h1>
                A gestão da CIPA
                <span> com o prazo na frente.</span>
              </h1>
              <p className="nh-lead">
                Mandato, reuniões, membros e a eleição da NR-05 no mesmo calendário.
                Você vê o que vence agora e o que só abre quando a data chega.
              </p>
              <div className="nh-acoes">
                <button type="button" className="nh-btn nh-btn--claro" onClick={() => handleOpenModal('cadastro')}>
                  Começar a gestão
                </button>
                <button type="button" className="nh-btn nh-btn--linha" onClick={() => handleOpenModal('login')}>
                  Entrar
                </button>
                <button type="button" className="nh-btn nh-btn--texto" onClick={() => irPara('eleicao')}>
                  Ver o calendário
                </button>
              </div>
            </div>

            <aside className="nh-painel" aria-label="Painel da gestão">
              <header>
                <span>Gestão atual</span>
                <strong>Em vigência</strong>
              </header>
              <div className="nh-painel__vigencia">
                <small>Fim do mandato</small>
                <b>60 dias</b>
                <em>para abrir a eleição</em>
                <i className="nh-barra"><i /></i>
              </div>
              <ul>
                <li className="is-agora">
                  <span>Validade</span>
                  <strong>Convocar a nova eleição</strong>
                </li>
                <li>
                  <span>Reunião</span>
                  <strong>Ata ordinária deste mês</strong>
                </li>
                <li>
                  <span>Eleição</span>
                  <strong>Edital ainda fechado</strong>
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="nh-pilares">
          {PILARES.map((item) => (
            <article key={item.id} id={item.id} className="nh-card nh-revela">
              <span className="nh-card__icone" aria-hidden>
                <i className={`pi ${item.icone}`} />
              </span>
              <p>{item.kicker}</p>
              <h2>{item.titulo}</h2>
              <p>{item.texto}</p>
            </article>
          ))}
        </section>

        <section className="nh-trilha" aria-labelledby="trilha-titulo">
          <div className="nh-trilha__topo nh-revela">
            <p>NR-05</p>
            <h2 id="trilha-titulo">Três marcas no caminho da eleição</h2>
          </div>
          <ol>
            {TRILHA.map((etapa, indice) => (
              <li key={etapa.dia} className="nh-revela" style={{ transitionDelay: `${indice * 120}ms` }}>
                <span>{etapa.dia}</span>
                <h3>{etapa.nome}</h3>
                <p>{etapa.detalhe}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="nh-fecho" id="planos">
          <div className="nh-revela">
            <div>
              <p>Comece grátis</p>
              <h2>Um projeto para organizar a CIPA que você já tem — ou a que ainda vai instalar.</h2>
            </div>
            <div className="nh-acoes">
              <button type="button" className="nh-btn nh-btn--claro" onClick={() => handleOpenModal('cadastro')}>
                Criar conta
              </button>
              <button type="button" className="nh-btn nh-btn--linha" onClick={() => handleOpenModal('login')}>
                Entrar
              </button>
            </div>
          </div>
        </section>
      </main>

      <Rodape onOpenModal={handleOpenModal} onScrollToSection={irPara} />

      <FormCadastroLogin isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <ModalIndicacaoParceiro
        open={indicacaoOpen}
        codigoTentado={codigoTentado}
        onClose={() => {
          setIndicacaoOpen(false);
          setAbrirCadastroAposIndicacao(false);
        }}
        onContinuarSemIndicacao={() => {
          bannerDismissedRef.current = true;
          setBannerIndicacao(null);
          setIndicacaoOpen(false);
          if (abrirCadastroAposIndicacao) {
            setAbrirCadastroAposIndicacao(false);
            abrirCadastro();
          }
        }}
        onIndicacaoCorrigida={(razao) => {
          bannerDismissedRef.current = false;
          mostrarBannerIndicacao(
            `Indicação ativa: ${razao}. Ao se cadastrar, este fornecedor será vinculado ao seu projeto.`,
          );
          setIndicacaoOpen(false);
          if (abrirCadastroAposIndicacao) {
            setAbrirCadastroAposIndicacao(false);
            abrirCadastro();
          }
        }}
      />
      {validandoCadastro ? (
        <div className="indicacao-validando" role="status">
          Verificando indicação do fornecedor…
        </div>
      ) : null}
    </div>
  );
}
