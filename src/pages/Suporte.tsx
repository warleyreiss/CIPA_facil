import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { FloatLabel } from 'primereact/floatlabel';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { enviarContatoEmail } from '../lib/contatoEmailService';
import {
  buscarOrientacaoPorId,
  categorizarOrientacao,
  estimarMinutosLeitura,
  extrairEmbedVideo,
  filtrarOrientacoes,
  isLinkInterno,
  isSuporteTemaSlug,
  listarOrientacoesSuporte,
  paragrafosDescricao,
  resolverOrientacaoPorTema,
  resumoDescricao,
  SUPORTE_CATEGORIAS,
  type SuporteCategoriaId,
  type SuporteOrientacao,
} from '../lib/suporteService';
import { tituloSuporteTema } from '../lib/suporteTemas';
import '../assets/css/especificos/suporte.css';

function DescricaoFormatada({ texto }: { texto: string }) {
  return (
    <div className="suporte-prose">
      {paragrafosDescricao(texto).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function BlocoVideo({ orientacao }: { orientacao: SuporteOrientacao }) {
  const embed = extrairEmbedVideo(orientacao.link_video);

  if (embed) {
    return (
      <div className="suporte-video">
        <iframe
          src={embed}
          title={orientacao.titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (orientacao.link_video) {
    return (
      <a
        href={orientacao.link_video}
        target="_blank"
        rel="noopener noreferrer"
        className="p-button p-button-outlined p-button-sm no-underline align-self-start"
      >
        <i className="pi pi-external-link mr-2" />
        Assistir vídeo complementar
      </a>
    );
  }

  return null;
}

function LinkMaterial({ href }: { href: string }) {
  const rotulo = href.startsWith('/') ? 'Abrir no sistema' : 'Baixar material';

  if (isLinkInterno(href)) {
    return (
      <Link to={href} className="p-button p-button-sm no-underline">
        <i className="pi pi-arrow-right mr-2" />
        {rotulo}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="p-button p-button-sm no-underline">
      <i className="pi pi-download mr-2" />
      {rotulo}
    </a>
  );
}

export default function Suporte() {
  const toast = useRef<Toast>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const idUrl = searchParams.get('id');
  const temaUrl = searchParams.get('tema');
  const buscaUrl = searchParams.get('q');

  const [orientacoes, setOrientacoes] = useState<SuporteOrientacao[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<SuporteCategoriaId | 'todas'>('todas');
  const [detalhe, setDetalhe] = useState<SuporteOrientacao | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [formContato, setFormContato] = useState({ full_name: '', email_address: '', message: '' });

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCarregandoLista(true);
      setErroLista(null);
      try {
        const data = await listarOrientacoesSuporte();
        if (!cancelado) setOrientacoes(data);
      } catch {
        if (!cancelado) setErroLista('Não foi possível carregar os temas de ajuda. Tente novamente.');
      } finally {
        if (!cancelado) setCarregandoLista(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (buscaUrl && !idUrl) setBusca(buscaUrl);
  }, [buscaUrl, idUrl]);

  useEffect(() => {
    if (idUrl || !temaUrl || orientacoes.length === 0) return;
    if (!isSuporteTemaSlug(temaUrl)) return;
    const item = resolverOrientacaoPorTema(orientacoes, temaUrl);
    if (item) {
      setSearchParams({ id: item.id }, { replace: true });
      return;
    }
    setBusca(tituloSuporteTema(temaUrl));
    setSearchParams({}, { replace: true });
  }, [idUrl, temaUrl, orientacoes, setSearchParams]);

  useEffect(() => {
    if (!idUrl) {
      setDetalhe(null);
      return;
    }
    const cache = orientacoes.find((o) => o.id === idUrl);
    if (cache) {
      setDetalhe(cache);
      return;
    }
    let cancelado = false;
    setCarregandoDetalhe(true);
    buscarOrientacaoPorId(idUrl)
      .then((item) => {
        if (!cancelado) setDetalhe(item);
      })
      .finally(() => {
        if (!cancelado) setCarregandoDetalhe(false);
      });
    return () => {
      cancelado = true;
    };
  }, [idUrl, orientacoes]);

  const resultadosBusca = useMemo(() => filtrarOrientacoes(orientacoes, busca), [orientacoes, busca]);

  const resultados = useMemo(() => {
    if (categoria === 'todas') return resultadosBusca;
    return resultadosBusca.filter((item) => categorizarOrientacao(item.titulo).id === categoria);
  }, [resultadosBusca, categoria]);

  const categoriasAtivas = useMemo(() => {
    const contagem = new Map<SuporteCategoriaId, number>();
    for (const item of resultadosBusca) {
      const id = categorizarOrientacao(item.titulo).id;
      contagem.set(id, (contagem.get(id) ?? 0) + 1);
    }
    return SUPORTE_CATEGORIAS.filter((c) => (contagem.get(c.id) ?? 0) > 0);
  }, [resultadosBusca]);

  const abrirOrientacao = useCallback(
    (id: string) => {
      setSearchParams({ id }, { replace: false });
    },
    [setSearchParams]
  );

  const voltarLista = useCallback(() => {
    setSearchParams({}, { replace: true });
    setDetalhe(null);
    setIsFormOpen(false);
  }, [setSearchParams]);

  const handleContatoChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormContato((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nome = formContato.full_name.trim();
    const email = formContato.email_address.trim();
    const mensagem = formContato.message.trim();
    if (!nome || !email || !mensagem) return;
    const contexto = detalhe ? `\n\n---\nTema consultado: ${detalhe.titulo}` : '';
    setEnviando(true);
    try {
      await enviarContatoEmail({ from_name: nome, reply_to: email, message: mensagem + contexto });
      toast.current?.show({
        severity: 'success',
        summary: 'Mensagem enviada',
        detail: 'Recebemos sua dúvida. Responderemos em breve.',
        life: 5000,
      });
      setFormContato({ full_name: '', email_address: '', message: '' });
      setIsFormOpen(false);
    } catch {
      toast.current?.show({
        severity: 'error',
        summary: 'Erro ao enviar',
        detail: 'Não foi possível enviar a mensagem. Tente novamente.',
        life: 6000,
      });
    } finally {
      setEnviando(false);
    }
  };

  const modoDetalhe = !!idUrl;

  useEffect(() => {
    if (!idUrl) setIsFormOpen(false);
  }, [idUrl]);

  const catDetalhe = detalhe ? categorizarOrientacao(detalhe.titulo) : null;
  const minutosDetalhe = detalhe ? estimarMinutosLeitura(detalhe.descricao) : 0;

  return (
    <div className="suporte-page">
      <Toast ref={toast} />

      {!modoDetalhe && (
        <>
          <header className="suporte-hero">
            <div className="suporte-hero__mesh" aria-hidden />
            <div className="suporte-hero__inner">
              <div className="suporte-hero__copy">
                <h1 className="suporte-hero__title">Central de Ajuda</h1>
                <p className="suporte-hero__subtitle">
                  Encontre respostas claras para usar o sistema com segurança.
                </p>
              </div>
              <div className="suporte-search">
                <i className="pi pi-search" aria-hidden />
                <InputText
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar orientação…"
                  className="w-full"
                  aria-label="Pesquisar temas de ajuda"
                />
                {busca && (
                  <Button
                    icon="pi pi-times"
                    onClick={() => setBusca('')}
                    text
                    rounded
                    severity="secondary"
                    className="suporte-search__clear"
                    aria-label="Limpar pesquisa"
                  />
                )}
              </div>
            </div>
          </header>

          <section className="suporte-lista" aria-label="Temas de ajuda">
            {!carregandoLista && !erroLista && categoriasAtivas.length > 0 && (
              <div className="suporte-filtros" role="tablist" aria-label="Filtrar por categoria">
                <button
                  type="button"
                  className={`suporte-chip${categoria === 'todas' ? ' is-active' : ''}`}
                  onClick={() => setCategoria('todas')}
                  aria-pressed={categoria === 'todas'}
                >
                  <i className="pi pi-th-large" aria-hidden />
                  Todas
                </button>
                {categoriasAtivas.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`suporte-chip${categoria === c.id ? ' is-active' : ''}`}
                    onClick={() => setCategoria(c.id)}
                    aria-pressed={categoria === c.id}
                  >
                    <i className={`pi ${c.icon}`} aria-hidden />
                    {c.rotulo}
                  </button>
                ))}
              </div>
            )}

            {!carregandoLista && !erroLista && (
              <p className="suporte-count">
                {resultados.length} {resultados.length === 1 ? 'orientação' : 'orientações'}
                {busca ? ` para “${busca}”` : ''}
              </p>
            )}

            {carregandoLista ? (
              <div className="suporte-loading">
                <i className="pi pi-spin pi-spinner" aria-hidden />
                <span>Carregando temas…</span>
              </div>
            ) : erroLista ? (
              <div className="suporte-empty">
                <Message severity="error" text={erroLista} className="w-full" />
                <Button label="Tentar novamente" onClick={() => navigate(0)} outlined />
              </div>
            ) : resultados.length === 0 ? (
              <div className="suporte-empty">
                <p>
                  {busca
                    ? `Nada encontrado para “${busca}”. Tente outra palavra.`
                    : 'Nenhum tema nesta categoria.'}
                </p>
                <Button
                  label={busca ? 'Limpar pesquisa' : 'Ver todas'}
                  text
                  onClick={() => {
                    setBusca('');
                    setCategoria('todas');
                  }}
                />
              </div>
            ) : (
              <div className="suporte-grid">
                {resultados.map((item) => {
                  const cat = categorizarOrientacao(item.titulo);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="suporte-card"
                      data-accent={cat.accent}
                      onClick={() => abrirOrientacao(item.id)}
                    >
                      <span className="suporte-card__cat">{cat.rotulo}</span>
                      <h3 className="suporte-card__title">{item.titulo}</h3>
                      <p className="suporte-card__excerpt">{resumoDescricao(item.descricao, 90)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {modoDetalhe && (
        <div className="suporte-article">
          <Button
            icon="pi pi-arrow-left"
            label="Voltar à Central"
            text
            severity="secondary"
            className="suporte-back"
            onClick={voltarLista}
          />

          {carregandoDetalhe && !detalhe ? (
            <div className="suporte-loading">
              <i className="pi pi-spin pi-spinner" aria-hidden />
              <span>Abrindo orientação…</span>
            </div>
          ) : !detalhe ? (
            <div className="suporte-empty">
              <div className="suporte-empty__icon" aria-hidden>
                <i className="pi pi-exclamation-circle" />
              </div>
              <p>Tema não encontrado ou removido.</p>
              <Button label="Ver todos os temas" onClick={voltarLista} />
            </div>
          ) : (
            <>
              <article className="suporte-read">
                <header className="suporte-read__head">
                  <div className="suporte-read__meta">
                    {catDetalhe && <span className="suporte-card__cat">{catDetalhe.rotulo}</span>}
                    <span className="suporte-read__time">{minutosDetalhe} min</span>
                  </div>
                  <h1 className="suporte-read__title">{detalhe.titulo}</h1>
                </header>
                <div className="suporte-read__body">
                  <BlocoVideo orientacao={detalhe} />
                  <DescricaoFormatada texto={detalhe.descricao} />
                  {detalhe.link_materiais && (
                    <div className="suporte-materiais">
                      <p className="suporte-materiais__label">Material de referência</p>
                      <LinkMaterial href={detalhe.link_materiais} />
                    </div>
                  )}
                </div>
              </article>

              <aside className="suporte-contato">
                {!isFormOpen ? (
                  <div className="suporte-contato__intro">
                    <div className="suporte-contato__copy">
                      <h3>Ainda com dúvida?</h3>
                      <p>Envie uma mensagem — respondemos no e-mail informado.</p>
                    </div>
                    <Button
                      label="Falar com o suporte"
                      icon="pi pi-envelope"
                      outlined
                      severity="secondary"
                      onClick={() => setIsFormOpen(true)}
                    />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="suporte-contato__form">
                    <div className="flex align-items-start justify-content-between gap-2">
                      <div className="suporte-contato__copy">
                        <h3>Enviar dúvida</h3>
                        <p>Incluiremos o tema “{detalhe.titulo}” na mensagem.</p>
                      </div>
                      <Button
                        type="button"
                        icon="pi pi-times"
                        text
                        severity="secondary"
                        rounded
                        aria-label="Fechar formulário"
                        onClick={() => setIsFormOpen(false)}
                      />
                    </div>
                    <div className="field m-0">
                      <FloatLabel>
                        <InputText
                          id="full_name_suporte"
                          name="full_name"
                          value={formContato.full_name}
                          onChange={handleContatoChange}
                          required
                          disabled={enviando}
                          autoComplete="name"
                          className="w-full"
                        />
                        <label htmlFor="full_name_suporte">Seu nome</label>
                      </FloatLabel>
                    </div>
                    <div className="field m-0">
                      <FloatLabel>
                        <InputText
                          id="email_address_suporte"
                          type="email"
                          name="email_address"
                          value={formContato.email_address}
                          onChange={handleContatoChange}
                          required
                          disabled={enviando}
                          autoComplete="email"
                          className="w-full"
                        />
                        <label htmlFor="email_address_suporte">Seu e-mail</label>
                      </FloatLabel>
                    </div>
                    <div className="field m-0">
                      <FloatLabel>
                        <InputTextarea
                          id="message_suporte"
                          name="message"
                          rows={3}
                          value={formContato.message}
                          onChange={handleContatoChange}
                          required
                          disabled={enviando}
                          className="w-full"
                        />
                        <label htmlFor="message_suporte">Sua dúvida</label>
                      </FloatLabel>
                    </div>
                    <Button
                      type="submit"
                      label={enviando ? 'Enviando…' : 'Enviar mensagem'}
                      icon={enviando ? 'pi pi-spin pi-spinner' : 'pi pi-send'}
                      loading={enviando}
                    />
                  </form>
                )}
              </aside>
            </>
          )}
        </div>
      )}
    </div>
  );
}
