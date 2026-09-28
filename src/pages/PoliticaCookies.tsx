import { Link } from 'react-router-dom';
import { EMPRESA } from '../config/empresa';
import PaginaLegal, { SecaoLegal, AlertaLegal, type SecaoLegal as SecaoIndice } from '../components/PaginaLegal';

const secoes: SecaoIndice[] = [
    { id: 'intro', label: '1. Introdução' },
    { id: 'definicoes', label: '2. Definições' },
    { id: 'escopo', label: '3. Escopo' },
    { id: 'categorias', label: '4. Categorias' },
    { id: 'essenciais', label: '5. Essenciais' },
    { id: 'funcionais', label: '6. Funcionais' },
    { id: 'consentimento', label: '7. Consentimento' },
    { id: 'sessao', label: '8. Armazenamento de Sessão' },
    { id: 'stripe', label: '9. Stripe' },
    { id: 'supabase-google', label: '10. Supabase e Google' },
    { id: 'publicidade', label: '11. Publicidade' },
    { id: 'analiticos', label: '12. Analíticos e Logs' },
    { id: 'resumo', label: '13. Resumo Técnico' },
    { id: 'bases-legais', label: '14. Bases Legais' },
    { id: 'gestao', label: '15. Como Gerenciar' },
    { id: 'banner', label: '16. Banner LGPD' },
    { id: 'consequencias', label: '17. Consequências' },
    { id: 'retencao', label: '18. Retenção' },
    { id: 'transferencia', label: '19. Transferência' },
    { id: 'alteracoes', label: '20. Alterações' },
    { id: 'legislacao', label: '21. Legislação' },
    { id: 'contato', label: '22. Contato' },
];

const DATA_ATUALIZACAO = '24/09/2026';
const VERSAO = '3.0.0';

export default function PoliticaCookies() {
    const enderecoCompleto = `${EMPRESA.rua}, nº ${EMPRESA.numero} — ${EMPRESA.cidade}/${EMPRESA.estado}, CEP ${EMPRESA.cep}`;

    return (
        <PaginaLegal
            titulo="Política de Cookies e Tecnologias Similares"
            subtitulo={`Versão ${VERSAO} — Atualizado em ${DATA_ATUALIZACAO}`}
            secoes={secoes}
            secaoInicial="intro"
        >
            <SecaoLegal id="intro">
                <h2>1. Introdução</h2>
                <p>
                    Esta Política de Cookies e Tecnologias Similares (&quot;Política de Cookies&quot;) explica como o
                    titular legal <strong>{EMPRESA.titularLegal}</strong> (CNPJ <strong>{EMPRESA.cnpj}</strong>, MEI),
                    operador da plataforma <strong>{EMPRESA.marca}</strong>™ / marca de serviços{' '}
                    <strong>{EMPRESA.marcaCasa}</strong>™ (&quot;Operadora&quot; ou &quot;nós&quot;), utiliza cookies,
                    localStorage, sessionStorage, pixels, identificadores de dispositivo e tecnologias equivalentes
                    (&quot;Tecnologias de Rastreamento&quot;) quando você visita nosso site, utiliza o painel autenticado
                    ou interage com funcionalidades vinculadas ao serviço.
                </p>
                <p>
                    Esta Política complementa a nossa{' '}
                    <Link to="/politica-privacidade">Política de Privacidade</Link> e os{' '}
                    <Link to="/termos-de-uso">Termos de Uso</Link>. Recomendamos a leitura conjunta dos três documentos
                    para compreensão integral de como tratamos dados pessoais e preferências de navegação.
                </p>
                <p>
                    Ao continuar navegando após visualizar o banner de cookies/LGPD ou ao clicar em &quot;Aceitar e
                    Continuar&quot;, você manifesta ciência sobre o uso de Tecnologias de Rastreamento conforme
                    descrito nesta Política, na medida em que exigido por lei.
                </p>
            </SecaoLegal>

            <SecaoLegal id="definicoes">
                <h2>2. Definições</h2>
                <ul>
                    <li>
                        <strong>Cookies:</strong> pequenos arquivos de texto armazenados no navegador ou dispositivo
                        quando você visita um site. Podem ser <em>de sessão</em> (eliminados ao fechar o navegador) ou{' '}
                        <em>persistentes</em> (permanecem até expirarem ou serem excluídos).
                    </li>
                    <li>
                        <strong>localStorage:</strong> mecanismo de armazenamento local no navegador que persiste dados
                        mesmo após encerrar a sessão, até remoção manual ou limpeza do navegador.
                    </li>
                    <li>
                        <strong>sessionStorage:</strong> armazenamento local temporário, limitado à aba/janela do
                        navegador, eliminado ao fechar a aba ou o navegador.
                    </li>
                    <li>
                        <strong>Pixels e web beacons:</strong> recursos invisíveis ou scripts que registram interações,
                        carregamentos de página ou conversões, frequentemente utilizados por redes de publicidade.
                    </li>
                    <li>
                        <strong>Tecnologias de Rastreamento:</strong> termo genérico que engloba cookies, localStorage,
                        sessionStorage, pixels, SDKs embarcados e identificadores similares.
                    </li>
                    <li>
                        <strong>First-party (primeira parte):</strong> tecnologias definidas diretamente pelo{' '}
                        {EMPRESA.nome}.
                    </li>
                    <li>
                        <strong>Third-party (terceiros):</strong> tecnologias definidas por parceiros integrados
                        (Stripe, Supabase, Google, redes de anúncios, etc.).
                    </li>
                </ul>
            </SecaoLegal>

            <SecaoLegal id="escopo">
                <h2>3. Escopo de Aplicação</h2>
                <p>Esta Política aplica-se a:</p>
                <ul>
                    <li>páginas públicas do {EMPRESA.nome} (landing page, login, cadastro, páginas legais);</li>
                    <li>painel autenticado e módulos internos da plataforma SaaS;</li>
                    <li>fluxos de assinatura, upgrade, downgrade e pagamento;</li>
                    <li>integrações com serviços de terceiros acessadas a partir da plataforma.</li>
                </ul>
                <p>
                    Tecnologias de terceiros acessadas diretamente em seus próprios domínios (ex.: portal do Stripe,
                    login Google) regem-se pelas políticas dos respectivos prestadores.
                </p>
            </SecaoLegal>

            <SecaoLegal id="categorias">
                <h2>4. Categorias de Tecnologias Utilizadas</h2>
                <p>Classificamos as Tecnologias de Rastreamento nas seguintes categorias:</p>
                <ul>
                    <li><strong>Estritamente necessárias (essenciais):</strong> indispensáveis ao funcionamento, autenticação e segurança.</li>
                    <li><strong>Funcionais:</strong> memorizam preferências e melhoram a experiência de uso.</li>
                    <li><strong>De consentimento:</strong> registram escolhas sobre cookies e avisos legais.</li>
                    <li><strong>De terceiros — pagamento:</strong> Stripe e serviços correlatos para cobrança e antifraude.</li>
                    <li><strong>De terceiros — autenticação e infraestrutura:</strong> Supabase, Google OAuth, CDN e nuvem.</li>
                    <li><strong>Publicitárias:</strong> exibidas em planos gratuitos, conforme Termos de Uso.</li>
                    <li><strong>Analíticas e de desempenho:</strong> logs, métricas e diagnóstico de uso.</li>
                </ul>
            </SecaoLegal>

            <SecaoLegal id="essenciais">
                <h2>5. Cookies e Armazenamentos Essenciais</h2>
                <p>
                    Tecnologias estritamente necessárias permitem funcionalidades básicas sem as quais a plataforma
                    não opera adequadamente. Incluem, entre outras:
                </p>
                <ul>
                    <li><strong>Autenticação e sessão:</strong> tokens e cookies de sessão gerenciados pelo Supabase Auth para manter login seguro, renovar sessão e proteger rotas autenticadas.</li>
                    <li><strong>Segurança:</strong> mecanismos anti-CSRF, validação de origem e proteção contra acesso não autorizado.</li>
                    <li><strong>Balanceamento e entrega:</strong> cookies técnicos de infraestrutura em nuvem para roteamento e disponibilidade.</li>
                </ul>
                <p>
                    Essas tecnologias <strong>não exigem consentimento</strong> nos termos da LGPD e regulamentações
                    correlatas, por serem necessárias à execução do serviço solicitado pelo titular ou à segurança.
                    Desativá-las impede o uso autenticado da plataforma.
                </p>
            </SecaoLegal>

            <SecaoLegal id="funcionais">
                <h2>6. Tecnologias Funcionais e de Preferência</h2>
                <p>
                    Utilizamos armazenamento local para personalizar e facilitar sua experiência. Exemplos concretos
                    implementados na plataforma:
                </p>
                <ul>
                    <li><strong>app-theme-mode</strong> (localStorage): memoriza preferência de tema claro ou escuro.</li>
                    <li><strong>sidebar-locked</strong> (localStorage): registra se o menu lateral está fixo ou retrátil.</li>
                    <li><strong>projetoAtivoId, projetoAtivoNome, projetoAtivoLogo, projetoAtivoUserId</strong> (localStorage): mantém o projeto/empresa selecionado entre sessões.</li>
                    <li><strong>projetoAtivoId</strong> (localStorage): lembra qual projeto da CIPA estava aberto.</li>
                    <li><strong>cepi_alertas_dismiss_{'{projetoId}'}</strong> (localStorage): memoriza alertas do painel dispensados por projeto.</li>
                    <li><strong>sb-*-auth-token</strong> (localStorage): sessão de autenticação gerenciada pelo Supabase Auth.</li>
                </ul>
                <p>
                    Essas tecnologias não são estritamente necessárias ao funcionamento mínimo do serviço, mas evitam
                    que você precise reconfigurar preferências a cada acesso. Podem basear-se em legítimo interesse
                    ou consentimento, conforme o caso.
                </p>
            </SecaoLegal>

            <SecaoLegal id="consentimento">
                <h2>7. Registro de Consentimento (Banner LGPD)</h2>
                <p>
                    Ao exibir o banner de cookies e proteção de dados na primeira visita (ou quando o registro
                    anterior foi removido), utilizamos:
                </p>
                <ul>
                    <li><strong>lgpd_aceite</strong> (localStorage): registra que você respondeu ao banner de cookies/LGPD.</li>
                    <li><strong>lgpd_consent_mode</strong> (localStorage): <code>all</code> (aceita publicidade) ou <code>essential</code> (apenas cookies essenciais).</li>
                </ul>
                <p>
                    O botão &quot;Preferências&quot; direciona a esta página para consulta detalhada. O botão
                    &quot;Aceitar e Continuar&quot; registra o aceite e oculta o banner.
                </p>
                <AlertaLegal titulo="SOBRE O NÍVEL ATUAL DE CONSENTIMENTO:">
                    O banner atual registra aceite geral para prosseguir na navegação. Cookies essenciais e funcionais
                    descritos nesta Política continuam necessários ou recomendados para operação adequada do serviço.
                    Futuras versões da plataforma poderão disponibilizar painel granular de preferências por categoria.
                </AlertaLegal>
            </SecaoLegal>

            <SecaoLegal id="sessao">
                <h2>8. Armazenamento Temporário de Sessão (sessionStorage)</h2>
                <p>
                    Dados temporários podem ser armazenados em <strong>sessionStorage</strong> durante fluxos
                    específicos, sendo eliminados ao fechar a aba ou concluir o processo:
                </p>
                <ul>
                    <li><strong>temp_nome, temp_empresa:</strong> dados parciais do cadastro/login enquanto o fluxo está em andamento.</li>
                    <li><strong>pending_registration_data:</strong> informações complementares de cadastro (ex.: após OAuth Google) até sincronização com a conta.</li>
                    <li><strong>targetPlan:</strong> plano selecionado temporariamente durante fluxo de upgrade ou downgrade.</li>
                </ul>
                <p>
                    Esses armazenamentos têm finalidade operacional, limitada à conclusão do fluxo iniciado pelo
                    usuário, e não persistem além da sessão do navegador.
                </p>
            </SecaoLegal>

            <SecaoLegal id="stripe">
                <h2>9. Cookies e Tecnologias do Stripe (Pagamentos)</h2>
                <p>
                    Ao contratar planos pagos ou interagir com checkout gerenciado pelo <strong>Stripe</strong>, cookies
                    e tecnologias similares desse prestador podem ser utilizados para:
                </p>
                <ul>
                    <li>processamento seguro de pagamentos;</li>
                    <li>prevenção a fraudes e chargebacks;</li>
                    <li>autenticação de transações e conformidade PCI-DSS;</li>
                    <li>funcionamento de elementos embarcados (checkout, portal do cliente).</li>
                </ul>
                <p>
                    A Operadora não controla cookies definidos pelo Stripe. Consulte a{' '}
                    <a href="https://stripe.com/br/privacy" target="_blank" rel="noopener noreferrer">Política de Privacidade do Stripe</a>{' '}
                    e a documentação sobre cookies do prestador para mais informações.
                </p>
            </SecaoLegal>

            <SecaoLegal id="supabase-google">
                <h2>10. Supabase, Google OAuth e Infraestrutura</h2>
                <h3>10.1. Supabase</h3>
                <p>
                    Utilizamos o Supabase para autenticação, banco de dados e armazenamento. Cookies e tokens
                    associados podem ser definidos para manter sessão, refresh de tokens e segurança da API.
                    Dados podem ser processados em servidores fora do Brasil, conforme Seção 19.
                </p>
                <h3>10.2. Google (OAuth e fontes)</h3>
                <p>
                    Quando você opta por login ou cadastro via Google, cookies e tecnologias do Google podem ser
                    utilizados para autenticação e prevenção a abusos. Páginas públicas também carregam recursos
                    externos (ex.: Google Fonts), que podem registrar interações conforme política do Google.
                </p>
                <h3>10.3. CDN e bibliotecas externas</h3>
                <p>
                    Recursos carregados de domínios terceiros (fontes, ícones, bibliotecas CSS) podem empregar
                    cookies técnicos ou logs de acesso. Recomendamos consultar as políticas dos respectivos provedores.
                </p>
            </SecaoLegal>

            <SecaoLegal id="publicidade">
                <h2>11. Cookies Publicitários (Google AdSense)</h2>
                <p>
                    Utilizamos o <strong>Google AdSense</strong> (cliente {EMPRESA.adsenseClient}) com anúncios
                    automáticos na <strong>página inicial</strong> e na área autenticada do{' '}
                    <strong>Plano Iniciante</strong>, conforme os{' '}
                    <Link to="/termos-de-uso">Termos de Uso</Link> e a{' '}
                    <Link to="/politica-privacidade">Política de Privacidade</Link>.
                </p>
                <p>
                    O script de anúncios só é carregado após o consentimento &quot;Aceitar todos&quot; no banner e
                    somente nas superfícies autorizadas. A opção &quot;Apenas essenciais&quot; mantém o serviço sem
                    cookies de publicidade.
                </p>
                <p>O Google pode definir cookies e identificadores para:</p>
                <ul>
                    <li>exibir anúncios relevantes ou rotacionados;</li>
                    <li>medir impressões, cliques e conversões;</li>
                    <li>limitar frequência de exibição (frequency capping);</li>
                    <li>detecção de fraude publicitária.</li>
                </ul>
                <p>
                    Esses cookies são de <strong>terceiros</strong>. A Operadora não controla integralmente
                    seu funcionamento. Preferências de anúncios personalizados do Google:{' '}
                    <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
                      adssettings.google.com
                    </a>
                    .
                </p>
            </SecaoLegal>

            <SecaoLegal id="analiticos">
                <h2>12. Cookies Analíticos, Logs e Desempenho</h2>
                <p>
                    Podemos utilizar — diretamente ou via prestadores — tecnologias para compreender uso agregado
                    da plataforma, diagnosticar erros e melhorar desempenho, incluindo:
                </p>
                <ul>
                    <li>logs de servidor (IP, user-agent, horário, URL acessada);</li>
                    <li>registros de eventos de erro e falhas de API;</li>
                    <li>métricas de tempo de resposta e disponibilidade;</li>
                    <li>ferramentas analíticas web, quando implementadas.</li>
                </ul>
                <p>
                    Sempre que possível, utilizamos dados agregados ou anonimizados. Quando identificadores pessoais
                    forem tratados, observaremos bases legais aplicáveis e a Política de Privacidade.
                </p>
            </SecaoLegal>

            <SecaoLegal id="resumo">
                <h2>13. Resumo das Tecnologias de Primeira Parte</h2>
                <p>
                    A tabela abaixo resume principais chaves de armazenamento local utilizadas diretamente pelo{' '}
                    {EMPRESA.nome}. Prazos de cookies de terceiros variam conforme cada prestador.
                </p>
                <ul>
                    <li><strong>lgpd_aceite</strong> — tipo: localStorage — finalidade: registro de aceite do banner — duração: até exclusão manual ou limpeza do navegador.</li>
                    <li><strong>app-theme-mode</strong> — tipo: localStorage — finalidade: tema claro/escuro — duração: persistente.</li>
                    <li><strong>sidebar-locked</strong> — tipo: localStorage — finalidade: preferência do menu — duração: persistente.</li>
                    <li><strong>projetoAtivo*</strong> — tipo: localStorage — finalidade: projeto selecionado (vinculado ao usuário via projetoAtivoUserId) — duração: persistente até troca de conta, logout com outro usuário ou limpeza manual.</li>
                    <li><strong>projetoAtivoId, projetoAtivoNome</strong> — tipo: localStorage — finalidade: projeto da CIPA em uso — duração: persistente.</li>
                    <li><strong>parceiro_indicacao_codigo, cepi_ultimo_acesso_registrado</strong> — tipo: sessionStorage — finalidade: indicação de parceiro e throttle de registro de acesso — duração: sessão da aba.</li>
                    <li><strong>temp_*, pending_registration_data, targetPlan</strong> — tipo: sessionStorage — finalidade: fluxos temporários — duração: sessão da aba.</li>
                    <li><strong>cepi_alertas_dismiss_*</strong> — tipo: localStorage — finalidade: alertas dispensados por projeto — duração: persistente.</li>
                    <li><strong>sb-*-auth-token</strong> — tipo: localStorage — finalidade: autenticação Supabase — duração: conforme sessão (removido no logout).</li>
                </ul>
                <p>
                    Esta lista pode ser atualizada conforme evolução da plataforma. Alterações relevantes serão
                    refletidas nesta Política.
                </p>
            </SecaoLegal>

            <SecaoLegal id="bases-legais">
                <h2>14. Bases Legais e Consentimento (LGPD)</h2>
                <p>O uso de Tecnologias de Rastreamento fundamenta-se, conforme a categoria:</p>
                <ul>
                    <li><strong>Execução de contrato (art. 7º, V, LGPD):</strong> cookies essenciais para autenticação e prestação do serviço SaaS.</li>
                    <li><strong>Legítimo interesse (art. 7º, IX):</strong> segurança, prevenção a fraudes, preferências funcionais e métricas agregadas de desempenho, com balanceamento de direitos.</li>
                    <li><strong>Consentimento (art. 7º, I):</strong> cookies publicitários não essenciais, certas analíticas e registro de aceite via banner, quando exigido.</li>
                    <li><strong>Cumprimento de obrigação legal (art. 7º, II):</strong> retenção de logs exigida por normas aplicáveis.</li>
                </ul>
                <p>
                    Você pode revogar consentimentos a qualquer tempo, conforme Seção 15, observadas limitações
                    técnicas e legais para cookies estritamente necessários.
                </p>
            </SecaoLegal>

            <SecaoLegal id="gestao">
                <h2>15. Como Gerenciar e Excluir Cookies</h2>
                <h3>15.1. Configurações do navegador</h3>
                <p>
                    A maioria dos navegadores permite visualizar, bloquear ou excluir cookies e dados de sites.
                    Consulte a ajuda oficial do seu navegador:
                </p>
                <ul>
                    <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
                    <li><a href="https://support.mozilla.org/pt-BR/kb/limpe-cookies-e-dados-de-sites-no-firefox" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
                    <li><a href="https://support.apple.com/pt-br/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari (macOS)</a></li>
                    <li><a href="https://support.microsoft.com/pt-br/microsoft-edge/excluir-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
                </ul>
                <h3>15.2. Limpeza de localStorage e sessionStorage</h3>
                <p>
                    Dados em localStorage e sessionStorage podem ser removidos pelas ferramentas de desenvolvedor
                    do navegador (Application / Armazenamento) ou pela função de limpar dados de navegação /
                    &quot;limpar dados do site&quot;.
                </p>
                <h3>15.3. Ferramentas de opt-out de publicidade</h3>
                <p>
                    Para anúncios personalizados de terceiros, você pode utilizar mecanismos de opt-out oferecidos
                    por associações do setor ou configurações do próprio anunciante, quando disponíveis.
                </p>
            </SecaoLegal>

            <SecaoLegal id="banner">
                <h2>16. Banner de Cookies e Preferências</h2>
                <p>
                    O banner exibido na landing e páginas públicas informa sobre o uso de cookies e direciona a
                    esta Política. Ao aceitar, registramos a preferência em <strong>lgpd_aceite</strong>.
                </p>
                <p>
                    Para revisar esta Política a qualquer momento, acesse o rodapé do site ou a URL{' '}
                    <Link to="/politica-cookies">/politica-cookies</Link>. Para revogar aceite, exclua cookies e
                    dados locais do site nas configurações do navegador — o banner poderá ser exibido novamente
                    na próxima visita.
                </p>
            </SecaoLegal>

            <SecaoLegal id="consequencias">
                <h2>17. Consequências de Desabilitar Tecnologias</h2>
                <p>A desativação ou exclusão de cookies e armazenamentos pode resultar em:</p>
                <ul>
                    <li>impossibilidade de login ou logout inesperado;</li>
                    <li>perda de projeto selecionado, tema e preferências de interface;</li>
                    <li>interrupção de fluxos de cadastro, upgrade ou pagamento;</li>
                    <li>falhas em checkout Stripe ou autenticação Google;</li>
                    <li>degradação de segurança e detecção de fraude;</li>
                    <li>exibição repetida do banner LGPD;</li>
                    <li>layout ou anúncios incorretos em planos gratuitos.</li>
                </ul>
                <p>
                    Cookies essenciais não podem ser recusados se você deseja utilizar a plataforma autenticada,
                    pois são tecnicamente necessários à prestação do serviço contratado ou solicitado.
                </p>
            </SecaoLegal>

            <SecaoLegal id="retencao">
                <h2>18. Prazos de Retenção</h2>
                <p>Os prazos variam conforme o tipo de tecnologia:</p>
                <ul>
                    <li><strong>Cookies de sessão:</strong> eliminados ao encerrar o navegador.</li>
                    <li><strong>Cookies persistentes:</strong> até data de expiração definida ou exclusão manual.</li>
                    <li><strong>localStorage:</strong> até exclusão pelo usuário ou limpeza do site.</li>
                    <li><strong>sessionStorage:</strong> limitado à sessão da aba.</li>
                    <li><strong>Logs de servidor:</strong> conforme política interna e exigências legais (ver Política de Privacidade).</li>
                </ul>
            </SecaoLegal>

            <SecaoLegal id="transferencia">
                <h2>19. Transferência Internacional</h2>
                <p>
                    Cookies e identificadores de terceiros (Supabase, Stripe, Google, redes de anúncios) podem
                    implicar transferência ou processamento de dados fora do Brasil. Adotamos salvaguardas
                    compatíveis com a LGPD, conforme detalhado na{' '}
                    <Link to="/politica-privacidade">Política de Privacidade</Link>.
                </p>
            </SecaoLegal>

            <SecaoLegal id="alteracoes">
                <h2>20. Alterações desta Política</h2>
                <p>
                    Podemos atualizar esta Política de Cookies para refletir mudanças tecnológicas, legais ou
                    operacionais. A versão vigente será indicada pelo número e data no topo desta página.
                </p>
                <p>
                    Alterações materiais poderão ser comunicadas por banner, aviso no painel ou e-mail cadastrado.
                    Recomendamos revisitar esta página periodicamente.
                </p>
            </SecaoLegal>

            <SecaoLegal id="legislacao">
                <h2>21. Legislação Aplicável</h2>
                <p>
                    Esta Política observa a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o Marco Civil da
                    Internet (Lei nº 12.965/2014), orientações da Autoridade Nacional de Proteção de Dados (ANPD)
                    e demais normas aplicáveis ao uso de cookies e tecnologias similares no Brasil.
                </p>
            </SecaoLegal>

            <SecaoLegal id="contato">
                <h2>22. Dúvidas, Privacidade e Contato</h2>
                <p>
                    Para questões sobre cookies, rastreamento ou proteção de dados, entre em contato:
                </p>
                <ul>
                    <li><strong>Titular legal (MEI):</strong> {EMPRESA.titularLegal}</li>
                    <li><strong>Marca do produto:</strong> {EMPRESA.marca}™</li>
                    <li><strong>Marca de serviços:</strong> {EMPRESA.marcaCasa}™</li>
                    <li><strong>CNPJ:</strong> {EMPRESA.cnpj}</li>
                    <li><strong>E-mail:</strong> <a href={`mailto:${EMPRESA.emailSuporte}`}>{EMPRESA.emailSuporte}</a></li>
                    <li><strong>Telefone:</strong> {EMPRESA.telefone}</li>
                    <li><strong>Endereço:</strong> {enderecoCompleto}</li>
                </ul>
                <p>
                    Para tratamento de dados pessoais em geral, consulte também a{' '}
                    <Link to="/politica-privacidade">Política de Privacidade</Link> e os{' '}
                    <Link to="/termos-de-uso">Termos de Uso</Link>.
                </p>
            </SecaoLegal>
        </PaginaLegal>
    );
}
