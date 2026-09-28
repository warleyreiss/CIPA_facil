import { Link } from 'react-router-dom';
import { EMPRESA } from '../config/empresa';
import PaginaLegal, { SecaoLegal, AlertaLegal, type SecaoLegal as SecaoIndice } from '../components/PaginaLegal';

const secoes: SecaoIndice[] = [
    { id: 'intro', label: '1. Introdução' },
    { id: 'definicoes', label: '2. Definições' },
    { id: 'controlador', label: '3. Quem Somos' },
    { id: 'dados-coletados', label: '4. Dados Coletados' },
    { id: 'formas-coleta', label: '5. Formas de Coleta' },
    { id: 'finalidades', label: '6. Finalidades' },
    { id: 'bases-legais', label: '7. Bases Legais' },
    { id: 'papeis-lgpd', label: '8. Papéis na LGPD' },
    { id: 'colaboradores', label: '9. Dados da CIPA' },
    { id: 'pagamentos', label: '10. Pagamentos (Stripe)' },
    { id: 'publicidade', label: '11. Plano Iniciante e Anúncios' },
    { id: 'compartilhamento', label: '12. Compartilhamento' },
    { id: 'transferencia', label: '13. Transferência Internacional' },
    { id: 'seguranca', label: '14. Segurança' },
    { id: 'retencao', label: '15. Retenção e Exclusão' },
    { id: 'direitos', label: '16. Direitos do Titular' },
    { id: 'exercicio-direitos', label: '17. Como Exercer Direitos' },
    { id: 'cookies', label: '18. Cookies e Tecnologias' },
    { id: 'criancas', label: '19. Crianças e Adolescentes' },
    { id: 'decisoes-automatizadas', label: '20. Decisões Automatizadas' },
    { id: 'incidentes', label: '21. Incidentes de Segurança' },
    { id: 'links-terceiros', label: '22. Links Externos' },
    { id: 'alteracoes', label: '23. Alterações' },
    { id: 'legislacao', label: '24. Legislação e ANPD' },
    { id: 'contato', label: '25. Contato e DPO' },
];

const DATA_ATUALIZACAO = '24/09/2026';
const VERSAO = '3.0.0';

export default function PoliticaPrivacidade() {
    const enderecoCompleto = `${EMPRESA.rua}, nº ${EMPRESA.numero} — ${EMPRESA.cidade}/${EMPRESA.estado}, CEP ${EMPRESA.cep}`;

    return (
        <PaginaLegal
            titulo="Política de Privacidade"
            subtitulo={`Versão ${VERSAO} — Atualizado em ${DATA_ATUALIZACAO} — Em conformidade com a LGPD (Lei nº 13.709/2018)`}
            secoes={secoes}
            secaoInicial="intro"
        >
            <SecaoLegal id="intro">
                <h2>1. Introdução e Escopo</h2>
                <p>
                    A presente Política de Privacidade (&quot;Política&quot;) descreve como o titular legal{' '}
                    <strong>{EMPRESA.titularLegal}</strong>, inscrito no CNPJ sob nº <strong>{EMPRESA.cnpj}</strong> (MEI),
                    com sede em {enderecoCompleto}, na qualidade de operador da plataforma{' '}
                    <strong>{EMPRESA.marca}</strong>™ (também identificada pela marca de serviços{' '}
                    <strong>{EMPRESA.marcaCasa}</strong>™), coleta, utiliza, armazena, compartilha e protege dados pessoais
                    no contexto da prestação de serviços de software na modalidade SaaS para gestão da CIPA
                    (&quot;Operadora&quot;, &quot;Prestador&quot; ou &quot;nós&quot;).
                </p>
                <p>
                    Esta Política aplica-se a visitantes do site, usuários cadastrados, administradores de conta,
                    assinantes de planos pagos ou gratuitos, membros da CIPA e convidados cujos dados são inseridos
                    pelo cliente, e quaisquer terceiros que interajam com a plataforma.
                </p>
                <p>
                    Ao utilizar o {EMPRESA.nome}, você declara ter lido e compreendido esta Política, bem como os{' '}
                    <Link to="/termos-de-uso">Termos de Uso</Link> e a{' '}
                    <Link to="/politica-cookies">Política de Cookies</Link>, que integram o conjunto normativo
                    aplicável ao tratamento de dados pessoais em nossa plataforma.
                </p>
                <AlertaLegal titulo="AVISO SOBRE FINALIDADE DOS DADOS:">
                    Os dados tratados pela plataforma destinam-se à gestão da CIPA: mandato, membros, reuniões,
                    atas e eleição. Registros digitais <strong>não substituem</strong> o que a NR-05 exige da
                    organização, como a comunicação ao sindicato e a guarda das atas. Para detalhes, consulte os{' '}
                    <Link to="/termos-de-uso">Termos de Uso</Link>.
                </AlertaLegal>
            </SecaoLegal>

            <SecaoLegal id="definicoes">
                <h2>2. Definições</h2>
                <p>Para fins desta Política, adotam-se as definições da Lei Geral de Proteção de Dados (LGPD) e, complementarmente:</p>
                <ul>
                    <li><strong>Dado Pessoal:</strong> informação relacionada a pessoa natural identificada ou identificável.</li>
                    <li><strong>Dado Pessoal Sensível:</strong> dado sobre origem racial ou étnica, convicção religiosa, opinião política, filiação sindical, dado referente à saúde ou à vida sexual, dado genético ou biométrico, quando vinculado a pessoa natural.</li>
                    <li><strong>Titular:</strong> pessoa natural a quem se referem os dados pessoais objeto de tratamento.</li>
                    <li><strong>Controlador:</strong> pessoa natural ou jurídica a quem competem as decisões referentes ao tratamento de dados pessoais.</li>
                    <li><strong>Operador:</strong> pessoa natural ou jurídica que realiza o tratamento de dados pessoais em nome do controlador.</li>
                    <li><strong>Tratamento:</strong> toda operação realizada com dados pessoais, como coleta, produção, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação, avaliação, controle, modificação, comunicação, transferência, difusão ou extração.</li>
                    <li><strong>Assinante ou Cliente:</strong> pessoa física ou jurídica contratante ou usuária da plataforma.</li>
                    <li><strong>Membro:</strong> titular, suplente ou reservista da CIPA cadastrado pelo Assinante.</li>
                    <li><strong>Convidado:</strong> pessoa convidada a acessar o projeto para ajudar na gestão.</li>
                    <li><strong>Encarregado (DPO):</strong> pessoa indicada para atuar como canal de comunicação entre o controlador/operador, os titulares e a Autoridade Nacional de Proteção de Dados (ANPD).</li>
                </ul>
            </SecaoLegal>

            <SecaoLegal id="controlador">
                <h2>3. Quem Somos e Papéis no Tratamento</h2>
                <p>
                    A Operadora é responsável pela operação técnica da plataforma {EMPRESA.nome}.
                    Dependendo da natureza dos dados e do contexto do tratamento, atuamos como{' '}
                    <strong>Controladora</strong> ou <strong>Operadora</strong>, conforme detalhado na Seção 8.
                </p>
                <h3>3.1. Dados em que somos Controladores</h3>
                <p>Somos Controladores, entre outros, quanto a:</p>
                <ul>
                    <li>dados de cadastro e autenticação de usuários da plataforma (administradores e gestores);</li>
                    <li>dados de navegação, logs técnicos, cookies e preferências de uso do site e painel;</li>
                    <li>comunicações enviadas ao nosso suporte ou formulários de contato;</li>
                    <li>dados relacionados à contratação de planos, faturamento e suporte comercial, na medida processada ou acessível por nós.</li>
                </ul>
                <h3>3.2. Dados em que somos Operadores</h3>
                <p>
                    Atuamos como Operadores quando processamos, em nome do Assinante (empregador/cliente), dados
                    pessoais de membros da CIPA e de convidados, atas, eleições, registros da gestão e demais
                    informações inseridas pelo Cliente na plataforma para fins de gestão interna.
                </p>
            </SecaoLegal>

            <SecaoLegal id="dados-coletados">
                <h2>4. Categorias de Dados Pessoais Coletados</h2>
                <p>Podemos tratar as seguintes categorias de dados, conforme a interação do titular com a plataforma:</p>

                <h3>4.1. Dados de identificação e cadastro (usuários da conta)</h3>
                <ul>
                    <li>nome completo;</li>
                    <li>endereço de e-mail;</li>
                    <li>telefone de contato;</li>
                    <li>CPF (quando solicitado no cadastro);</li>
                    <li>senha (armazenada de forma criptografada/hasheada — nunca em texto puro);</li>
                    <li>foto de perfil (quando enviada voluntariamente);</li>
                    <li>identificadores de autenticação social (ex.: Google OAuth), quando utilizados.</li>
                </ul>

                <h3>4.2. Dados empresariais e de projeto</h3>
                <ul>
                    <li>razão social ou nome do projeto/empresa;</li>
                    <li>CNPJ (para contas empresariais);</li>
                    <li>tipo de cadastro (pessoa física ou jurídica);</li>
                    <li>logotipo ou imagem institucional (quando aplicável);</li>
                    <li>função da pessoa no projeto (gestor ou convidado).</li>
                </ul>

                <h3>4.3. Dados de membros da CIPA inseridos pelo Assinante</h3>
                <ul>
                    <li>nome;</li>
                    <li>condição na comissão (titular, suplente ou reservista);</li>
                    <li>datas de mandato ou de registro, quando informadas;</li>
                    <li>situação do vínculo na gestão (ativo ou encerrado).</li>
                </ul>

                <h3>4.4. Dados da gestão da CIPA</h3>
                <ul>
                    <li>início e fim do mandato e se a CIPA já estava em andamento;</li>
                    <li>reuniões, atas e modelos de documento editados para impressão;</li>
                    <li>eleições, etapas, prazos e apuração;</li>
                    <li>ações da rotina e seus prazos;</li>
                    <li>registros de alteração do projeto.</li>
                </ul>

                <h3>4.5. Dados financeiros e de assinatura</h3>
                <ul>
                    <li>plano contratado, status da assinatura, histórico de upgrades/downgrades;</li>
                    <li>identificadores de cliente e assinatura no Stripe (ex.: customer_id, subscription_id);</li>
                    <li>dados de cobrança processados pelo Stripe — <strong>não armazenamos</strong> número completo de cartão, CVV ou dados sensíveis de pagamento em nossos servidores.</li>
                </ul>

                <h3>4.6. Dados técnicos e de navegação</h3>
                <ul>
                    <li>endereço IP;</li>
                    <li>tipo e versão de navegador, sistema operacional e dispositivo;</li>
                    <li>data, hora e duração de acesso;</li>
                    <li>páginas visitadas, cliques e interações na plataforma;</li>
                    <li>cookies, localStorage e tecnologias similares (conforme Seção 18 e Política de Cookies);</li>
                    <li>logs de erro, diagnóstico e segurança.</li>
                </ul>

                <h3>4.7. Dados de comunicação</h3>
                <ul>
                    <li>conteúdo de mensagens enviadas ao suporte, formulários de contato ou central de ajuda;</li>
                    <li>registros de e-mails transacionais (confirmação de cadastro, avisos de assinatura, etc.).</li>
                </ul>

                <p>
                    <strong>Dados sensíveis:</strong> a plataforma não solicita, como regra, dados pessoais sensíveis
                    nos termos da LGPD. Caso o Assinante insira informações que possam ser classificadas como sensíveis
                    (ex.: informação de saúde anotada em uma ata), o tratamento será de responsabilidade
                    primária do Controlador (Assinante), que deverá possuir base legal adequada para tal.
                </p>
            </SecaoLegal>

            <SecaoLegal id="formas-coleta">
                <h2>5. Formas de Coleta de Dados</h2>
                <p>Os dados pessoais são obtidos por meio de:</p>
                <ul>
                    <li><strong>Fornecimento direto:</strong> cadastro, perfil, membros da CIPA, reuniões, eleições e demais entradas manuais na plataforma.</li>
                    <li><strong>Autenticação de terceiros:</strong> login via Google ou outros provedores OAuth, quando disponibilizados, nos termos autorizados pelo titular.</li>
                    <li><strong>Coleta automática:</strong> cookies, logs de servidor, tokens de sessão e registros técnicos gerados pelo uso da plataforma.</li>
                    <li><strong>Processadores terceiros:</strong> Stripe (pagamentos), Supabase (hospedagem de banco de dados e autenticação), EmailJS ou serviços equivalentes (envio de e-mails de contato), conforme Seção 12.</li>
                    <li><strong>Inserção pelo Assinante:</strong> dados de membros, convidados e registros da gestão fornecidos pela organização.</li>
                </ul>
            </SecaoLegal>

            <SecaoLegal id="finalidades">
                <h2>6. Finalidades do Tratamento</h2>
                <p>Tratamos dados pessoais para as seguintes finalidades, conforme aplicável:</p>
                <ul>
                    <li>criar, autenticar e gerenciar contas de usuário;</li>
                    <li>prestar o serviço de gestão da CIPA, incluindo mandato, membros, reuniões, atas, eleição e prazos;</li>
                    <li>viabilizar a criação e administração de projetos, usuários vinculados e permissões de acesso;</li>
                    <li>processar assinaturas, cobranças, upgrades, downgrades e cancelamentos;</li>
                    <li>enviar comunicações transacionais (confirmações, alertas de sistema, avisos de assinatura);</li>
                    <li>prestar suporte técnico e responder solicitações de atendimento;</li>
                    <li>garantir segurança da plataforma, prevenir fraudes, abusos e acessos não autorizados;</li>
                    <li>realizar logs de auditoria, diagnóstico de falhas e melhoria contínua do serviço;</li>
                    <li>cumprir obrigações legais, regulatórias ou ordens de autoridade competente;</li>
                    <li>exibir publicidade e conteúdo patrocinado em planos gratuitos, conforme Seção 11;</li>
                    <li>exercer direitos em processos judiciais, administrativos ou arbitrais.</li>
                </ul>
                <p>
                    <strong>Não vendemos</strong> dados pessoais a terceiros. Não utilizamos dados de membros da CIPA
                    inseridos pelo Assinante para marketing direcionado de terceiros, salvo com base legal específica
                    e informação adequada ao titular.
                </p>
            </SecaoLegal>

            <SecaoLegal id="bases-legais">
                <h2>7. Bases Legais para o Tratamento (LGPD)</h2>
                <p>O tratamento de dados pessoais fundamenta-se, conforme o caso, nas hipóteses do art. 7º da LGPD:</p>
                <ul>
                    <li><strong>Execução de contrato ou procedimentos preliminares (art. 7º, V):</strong> cadastro, prestação do serviço SaaS, gestão de assinatura e funcionalidades contratadas.</li>
                    <li><strong>Consentimento (art. 7º, I):</strong> cookies não essenciais, comunicações opcionais, login social e demais hipóteses em que o consentimento seja solicitado de forma específica.</li>
                    <li><strong>Legítimo interesse (art. 7º, IX):</strong> segurança da plataforma, prevenção a fraudes, melhoria do serviço, logs técnicos e comunicações essenciais, observado o balanceamento com direitos do titular.</li>
                    <li><strong>Cumprimento de obrigação legal ou regulatória (art. 7º, II):</strong> retenção de registros exigidos por lei, resposta a autoridades.</li>
                    <li><strong>Exercício regular de direitos (art. 7º, VI):</strong> defesa em processos judiciais ou administrativos.</li>
                    <li><strong>Proteção do crédito (art. 7º, X):</strong> quando aplicável a cobranças e inadimplência via Stripe.</li>
                </ul>
                <p>
                    Quanto a dados de membros e convidados inseridos pelo Assinante, a base legal primária é definida pelo
                    empregador (Controlador), podendo incluir execução de contrato de trabalho, cumprimento de
                    obrigação legal (NR-6 e correlatas), legítimo interesse ou consentimento, conforme o caso concreto.
                </p>
            </SecaoLegal>

            <SecaoLegal id="papeis-lgpd">
                <h2>8. Papéis na LGPD — Controlador e Operador</h2>
                <p>Para maior clareza sobre responsabilidades no ecossistema {EMPRESA.nome}:</p>

                <h3>8.1. Assinante como Controlador</h3>
                <p>
                    O <strong>Assinante</strong> (empregador, empresa ou gestor contratante) é, em regra, o{' '}
                    <strong>Controlador</strong> dos dados pessoais dos membros da CIPA e das informações da gestão
                    inseridas na plataforma. Cabe ao Controlador:
                </p>
                <ul>
                    <li>definir finalidades e meios de tratamento dos dados dos membros e convidados;</li>
                    <li>garantir base legal adequada para a coleta e tratamento;</li>
                    <li>informar membros e convidados sobre o uso da plataforma e seus direitos;</li>
                    <li>atender solicitações de titulares quanto a dados sob seu controle;</li>
                    <li>assegurar veracidade e atualização dos dados inseridos.</li>
                </ul>

                <h3>8.2. Prestador como Operadora</h3>
                <p>
                    A Operadora atua como <strong>Operadora</strong> ao processar dados de membros e convidados
                    e registros operacionais conforme instruções do Assinante, limitando-se a hospedar, organizar,
                    exibir, exportar e processar tecnicamente tais informações para execução do serviço contratado.
                </p>

                <h3>8.3. Prestador como Controladora</h3>
                <p>
                    Somos <strong>Controladores</strong> dos dados de cadastro de usuários administradores, dados
                    técnicos de navegação, cookies (na medida aplicável), comunicações diretas conosco e informações
                    de assinatura necessárias à operação comercial da plataforma.
                </p>

                <AlertaLegal titulo="CANAL DE QUEM TEVE O NOME CADASTRADO:">
                    Se o seu nome foi inserido por uma organização (como membro da CIPA ou convidado), peça acesso,
                    correção ou exclusão <strong>primeiro a essa organização (Controladora)</strong>. Atendemos o
                    pedido direto quando a lei exigir ou quando não for possível achar a organização.
                </AlertaLegal>
            </SecaoLegal>

            <SecaoLegal id="colaboradores">
                <h2>9. Tratamento de Dados da CIPA</h2>
                <p>
                    A plataforma permite que o Assinante cadastre membros, reuniões, atas e o processo eleitoral
                    para organizar a gestão da CIPA. Esse tratamento ocorre para a gestão interna da organização.
                </p>
                <p>O Assinante declara, ao utilizar essas funções, que:</p>
                <ul>
                    <li>possui legitimidade e base legal para tratar os dados que cadastrar;</li>
                    <li>informou ou informará as pessoas sobre o tratamento, quando a lei exigir;</li>
                    <li>inserirá apenas o que for necessário à gestão da CIPA e à eleição da NR-05;</li>
                    <li>continua responsável por cumprir a NR-05 fora do sistema, inclusive comunicação ao sindicato e guarda dos documentos.</li>
                </ul>
                <p>
                    Usuários cadastrados na modalidade <strong>Autônomo</strong> tratam predominantemente dados próprios
                    ou de terceiros por iniciativa voluntária, assumindo responsabilidade por base legal e transparência
                    quando aplicável, conforme descrito nos <Link to="/termos-de-uso">Termos de Uso</Link>.
                </p>
                <p>
                    A Operadora não utiliza dados da gestão da CIPA para marketing próprio nem
                    comercializa bases de dados de terceiros. O acesso interno por nossa equipe restringe-se a
                    hipóteses de suporte técnico, segurança ou cumprimento legal, com controles de autorização.
                </p>
            </SecaoLegal>

            <SecaoLegal id="pagamentos">
                <h2>10. Pagamentos e Dados Financeiros (Stripe)</h2>
                <p>
                    Assinaturas pagas são processadas pelo <strong>Stripe, Inc.</strong>, prestador de serviços de
                    pagamento independente. Ao contratar plano pago, determinados dados (nome, e-mail, identificadores
                    de transação e dados de pagamento) são compartilhados com o Stripe para processamento da cobrança.
                </p>
                <p>
                    A Operadora <strong>não armazena</strong> em seus servidores números completos de
                    cartão de crédito, CVV ou demais credenciais de pagamento. Tais informações são tratadas
                    diretamente pelo Stripe, conforme sua{' '}
                    <a href="https://stripe.com/br/privacy" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>.
                </p>
                <p>Podemos receber e armazenar do Stripe:</p>
                <ul>
                    <li>identificadores de cliente e assinatura;</li>
                    <li>status de pagamento e inadimplência;</li>
                    <li>plano contratado e histórico de faturamento (metadados, não dados completos de cartão).</li>
                </ul>
            </SecaoLegal>

            <SecaoLegal id="publicidade">
                <h2>11. Plano Gratuito (Iniciante), Publicidade e Terceiros Anunciantes</h2>
                <p>
                    Usuários do <strong>Plano Gratuito (Iniciante)</strong> e visitantes da página inicial estão
                    sujeitos à exibição de anúncios automáticos do <strong>Google AdSense</strong> (publisher{' '}
                    {EMPRESA.adsenseClient}), além de banners ou materiais promocionais próprios — inclusive, quando
                    aplicável, em documentos impressos — conforme os{' '}
                    <Link to="/termos-de-uso">Termos de Uso</Link> e a matriz comercial de recursos.
                </p>
                <p>
                    Em planos pagos (Pro, Gestor e equivalentes), a área autenticada da plataforma não carrega o
                    script de anúncios do AdSense. Páginas legais, login e demais rotas públicas fora da home também
                    não habilitam a superfície de anúncios.
                </p>
                <p>
                    O Google e parceiros podem utilizar cookies, identificadores de dispositivo ou tecnologias
                    semelhantes para medição, personalização ou entrega de anúncios, nos termos das políticas do
                    Google. A exibição de anúncios personalizados depende do consentimento coletado no banner de
                    cookies (&quot;Aceitar todos&quot;).
                </p>
                <p>
                    A Operadora não controla integralmente as práticas de privacidade do Google AdSense.
                    Recomendamos a leitura das políticas do Google e a gestão de preferências conforme a{' '}
                    <Link to="/politica-cookies">Política de Cookies</Link>.
                </p>
            </SecaoLegal>

            <SecaoLegal id="compartilhamento">
                <h2>12. Compartilhamento de Dados com Terceiros</h2>
                <p>Podemos compartilhar dados pessoais nas seguintes hipóteses:</p>

                <h3>12.1. Prestadores de serviço (suboperadores)</h3>
                <ul>
                    <li><strong>Supabase:</strong> hospedagem de banco de dados, autenticação de usuários e armazenamento de arquivos (ex.: fotos de perfil).</li>
                    <li><strong>Stripe:</strong> processamento de pagamentos e gestão de assinaturas.</li>
                    <li><strong>EmailJS ou equivalentes:</strong> envio de mensagens de formulários de contato e suporte.</li>
                    <li><strong>Google:</strong> autenticação OAuth, quando o usuário opta por login social.</li>
                    <li><strong>Provedores de infraestrutura em nuvem:</strong> hospedagem, CDN, backup e monitoramento.</li>
                    <li><strong>Redes de publicidade:</strong> no Plano Gratuito, conforme Seção 11.</li>
                </ul>
                <p>
                    Esses parceiros tratam dados conforme contratos e apenas na medida necessária à prestação
                    do serviço contratado, sendo instruídos a adotar medidas de segurança compatíveis.
                </p>

                <h3>12.2. Outras hipóteses de compartilhamento</h3>
                <ul>
                    <li><strong>Obrigação legal:</strong> cumprimento de lei, regulamento, processo judicial ou requisição de autoridade pública.</li>
                    <li><strong>Proteção de direitos:</strong> defesa em litígios, investigação de fraudes ou violações dos Termos de Uso.</li>
                    <li><strong>Operações societárias:</strong> fusão, aquisição ou venda de ativos, com observância das exigências legais aplicáveis.</li>
                    <li><strong>Com consentimento:</strong> quando autorizado expressamente pelo titular.</li>
                </ul>

                <p>
                    <strong>Não vendemos, alugamos ou comercializamos</strong> bases de dados pessoais a terceiros
                    para fins de marketing independente.
                </p>
            </SecaoLegal>

            <SecaoLegal id="transferencia">
                <h2>13. Transferência Internacional de Dados</h2>
                <p>
                    Alguns prestadores de serviço utilizados pela plataforma (como Supabase, Stripe, Google e
                    provedores de nuvem) podem processar ou armazenar dados em servidores localizados fora do
                    Brasil, inclusive nos Estados Unidos ou União Europeia.
                </p>
                <p>
                    Quando houver transferência internacional, adotaremos salvaguardas previstas na LGPD, como:
                </p>
                <ul>
                    <li>cláusulas contratuais padrão ou específicas com os prestadores;</li>
                    <li>verificação de países ou organismos com nível adequado de proteção, quando aplicável;</li>
                    <li>consentimento específico do titular, quando exigido;</li>
                    <li>garantias de conformidade com padrões reconhecidos de segurança e privacidade.</li>
                </ul>
                <p>
                    Ao utilizar a plataforma, o titular reconhece que determinados tratamentos podem envolver
                    transferência internacional necessária à operação do serviço.
                </p>
            </SecaoLegal>

            <SecaoLegal id="seguranca">
                <h2>14. Medidas de Segurança e Proteção</h2>
                <p>
                    Empregamos medidas técnicas e organizacionais razoáveis para proteger dados pessoais contra
                    acesso não autorizado, destruição, perda, alteração, comunicação ou difusão indevida, incluindo:
                </p>
                <ul>
                    <li>comunicação criptografada via HTTPS/TLS;</li>
                    <li>autenticação segura e controle de acesso baseado em permissões;</li>
                    <li>isolamento lógico de dados por conta/projeto (multi-tenant);</li>
                    <li>políticas de senha e tokens de sessão;</li>
                    <li>backups e redundância conforme práticas dos provedores de infraestrutura;</li>
                    <li>monitoramento de logs e detecção de atividades suspeitas;</li>
                    <li>restrição de acesso interno aos dados conforme necessidade.</li>
                </ul>
                <p>
                    Nenhum sistema é 100% seguro. O titular também deve adotar precauções, como utilizar senhas
                    fortes, não compartilhar credenciais e encerrar sessões em dispositivos compartilhados.
                </p>
            </SecaoLegal>

            <SecaoLegal id="retencao">
                <h2>15. Prazo de Retenção e Exclusão de Dados</h2>
                <p>
                    Os dados pessoais são mantidos pelo tempo necessário para cumprir as finalidades descritas nesta
                    Política, exceto quando período superior for exigido ou permitido por lei.
                </p>
                <ul>
                    <li><strong>Conta ativa:</strong> dados mantidos enquanto durar a relação contratual e uso da plataforma.</li>
                    <li><strong>Após cancelamento:</strong> em regra, dados poderão ser retidos por até <strong>30 (trinta) dias</strong> para eventual exportação ou recuperação solicitada, salvo obrigação legal de retenção por prazo superior.</li>
                    <li><strong>Logs de segurança:</strong> podem ser mantidos por prazo adicional compatível com investigação de incidentes e conformidade.</li>
                    <li><strong>Dados fiscais e de cobrança:</strong> retidos conforme prazos legais aplicáveis (ex.: legislação tributária).</li>
                    <li><strong>Dados anonimizados ou agregados:</strong> podem ser conservados indefinidamente para estatísticas e melhoria do serviço, desde que não permitam identificação do titular.</li>
                </ul>
                <p>
                    Decorridos os prazos aplicáveis, os dados serão eliminados ou anonimizados de forma segura,
                    salvo hipótese de retenção legal ou exercício de direitos. A exclusão pode ser irreversível.
                </p>
            </SecaoLegal>

            <SecaoLegal id="direitos">
                <h2>16. Direitos do Titular de Dados (LGPD — art. 18)</h2>
                <p>
                    Nos termos da LGPD, o titular de dados pessoais pode solicitar, conforme aplicável:
                </p>
                <ul>
                    <li><strong>Confirmação e acesso:</strong> saber se tratamos seus dados e obter cópia.</li>
                    <li><strong>Correção:</strong> atualizar dados incompletos, inexatos ou desatualizados.</li>
                    <li><strong>Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários, excessivos ou tratados em desconformidade.</li>
                    <li><strong>Portabilidade:</strong> receber dados em formato estruturado, quando aplicável.</li>
                    <li><strong>Eliminação:</strong> de dados tratados com base no consentimento, quando revogado e não houver outra base legal.</li>
                    <li><strong>Informação sobre compartilhamento:</strong> entidades públicas e privadas com as quais compartilhamos dados.</li>
                    <li><strong>Informação sobre consentimento:</strong> possibilidade de não fornecer consentimento e consequências.</li>
                    <li><strong>Revogação do consentimento:</strong> a qualquer tempo, mediante manifestação expressa.</li>
                    <li><strong>Oposição:</strong> a tratamentos realizados com fundamento em hipótese legal específica, quando cabível.</li>
                    <li><strong>Revisão de decisões automatizadas:</strong> conforme Seção 20.</li>
                </ul>
                <p>
                    O exercício de direitos pode estar sujeito a verificação de identidade e limitações legais
                    (ex.: dados que devem ser mantidos por obrigação legal ou para defesa de direitos).
                </p>
            </SecaoLegal>

            <SecaoLegal id="exercicio-direitos">
                <h2>17. Como Exercer Seus Direitos</h2>
                <h3>17.1. Usuários administradores e assinantes</h3>
                <p>
                    Solicitações relacionadas à sua conta, cadastro, assinatura ou dados sob nosso controle direto
                    podem ser enviadas para <a href={`mailto:${EMPRESA.emailSuporte}`}>{EMPRESA.emailSuporte}</a>,
                    informando nome, e-mail cadastrado e descrição do pedido.
                </p>
                <p>
                    Determinadas ações (atualização de perfil, exportação parcial de dados) podem ser realizadas
                    diretamente no painel da plataforma, quando disponíveis.
                </p>

                <h3>17.2. Colaboradores</h3>
                <p>
                    Colaboradores cujos dados foram inseridos por empregador devem, preferencialmente, contatar
                    seu empregador (Controlador). Caso não obtenha resposta adequada, poderá nos contatar e
                    avaliaremos o pedido conforme a LGPD e nosso papel como Operador.
                </p>

                <h3>17.3. Prazo de resposta</h3>
                <p>
                    Empreenderemos esforços para responder solicitações em prazo razoável, observando prazos legais
                    aplicáveis. Podemos solicitar informações adicionais para confirmar identidade e evitar
                    divulgação indevida a terceiros.
                </p>
            </SecaoLegal>

            <SecaoLegal id="cookies">
                <h2>18. Cookies, LocalStorage e Tecnologias Similares</h2>
                <p>
                    Utilizamos cookies, localStorage, sessionStorage e tecnologias equivalentes para:
                </p>
                <ul>
                    <li>manter sessão autenticada e segurança do acesso;</li>
                    <li>lembrar preferências (ex.: tema claro/escuro, menu fixo);</li>
                    <li>registrar aceite de banner LGPD/cookies;</li>
                    <li>medição de uso, diagnóstico e prevenção a fraudes;</li>
                    <li>entrega de publicidade no Plano Gratuito, quando aplicável.</li>
                </ul>
                <p>
                    Detalhes sobre categorias de cookies, finalidades, prazos de retenção e formas de gestão
                    encontram-se na nossa <Link to="/politica-cookies">Política de Cookies</Link>, que complementa
                    esta Política.
                </p>
            </SecaoLegal>

            <SecaoLegal id="criancas">
                <h2>19. Crianças e Adolescentes</h2>
                <p>
                    A plataforma {EMPRESA.nome} destina-se ao uso empresarial e profissional, não sendo voltada
                    a menores de 18 anos. Não coletamos intencionalmente dados pessoais de crianças ou adolescentes
                    sem base legal adequada e consentimento de responsável legal, quando exigido.
                </p>
                <p>
                    Se tomarmos conhecimento de coleta inadvertida de dados de menores em desconformidade com a
                    legislação, adotaremos medidas para eliminar tais informações, conforme aplicável.
                </p>
            </SecaoLegal>

            <SecaoLegal id="decisoes-automatizadas">
                <h2>20. Decisões Automatizadas e Perfilamento</h2>
                <p>
                    A plataforma pode aplicar regras automatizadas para funcionalidades operacionais, como alertas
                    de prazo da eleição e das ações, limite de projetos, bloqueio por inadimplência ou restrição de acesso.
                    Tais processos <strong>não produzem</strong>, como regra, efeitos jurídicos ou impactos
                    significativos sobre o titular no sentido do art. 20 da LGPD, limitando-se à operação do serviço.
                </p>
                <p>
                    Não realizamos perfilamento para fins de marketing invasivo ou decisões exclusivamente
                    automatizadas com efeitos legais relevantes sobre membros cadastrados pelo Assinante.
                </p>
            </SecaoLegal>

            <SecaoLegal id="incidentes">
                <h2>21. Incidentes de Segurança e Comunicação</h2>
                <p>
                    Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares,
                    adotaremos medidas de contenção, investigação e mitigação, bem como comunicação à ANPD e aos
                    titulares afetados, nos prazos e condições previstos na LGPD e regulamentações aplicáveis.
                </p>
                <p>
                    Quando atuarmos como Operadores, notificaremos o Controlador (Assinante) sobre incidentes
                    relacionados a dados sob sua responsabilidade, para que este cumpra suas obrigações legais.
                </p>
            </SecaoLegal>

            <SecaoLegal id="links-terceiros">
                <h2>22. Links, Sites e Serviços de Terceiros</h2>
                <p>
                    A plataforma pode conter links para sites, APIs ou serviços de terceiros (Stripe, Google,
                    anunciantes, documentação externa). A Operadora não se responsabiliza pelas
                    práticas de privacidade desses terceiros. Recomendamos a leitura das políticas de privacidade
                    de cada serviço acessado.
                </p>
            </SecaoLegal>

            <SecaoLegal id="alteracoes">
                <h2>23. Alterações desta Política</h2>
                <p>
                    Podemos atualizar esta Política periodicamente para refletir mudanças legais, técnicas ou
                    operacionais. A versão vigente será indicada pelo número e data no topo desta página.
                </p>
                <p>
                    Alterações materiais poderão ser comunicadas por e-mail cadastrado, aviso no painel ou banner
                    na plataforma. O uso continuado após a publicação de alterações implica ciência da nova versão.
                    Se você discordar de modificação substancial, deverá cessar o uso e solicitar encerramento da conta.
                </p>
            </SecaoLegal>

            <SecaoLegal id="legislacao">
                <h2>24. Legislação Aplicável e Autoridade Nacional</h2>
                <p>
                    Esta Política é regida pela legislação brasileira, em especial pela Lei nº 13.709/2018 (LGPD),
                    pelo Marco Civil da Internet (Lei nº 12.965/2014) e demais normas aplicáveis.
                </p>
                <p>
                    Sem prejuízo de outros canais, o titular pode apresentar reclamação à{' '}
                    <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> caso entenda que o tratamento
                    de seus dados pessoais viola a legislação vigente.
                </p>
            </SecaoLegal>

            <SecaoLegal id="contato">
                <h2>25. Contato, Encarregado de Dados (DPO) e Canal de Privacidade</h2>
                <p>
                    Para dúvidas, solicitações ou reclamações relacionadas a esta Política e ao tratamento de
                    dados pessoais, entre em contato:
                </p>
                <ul>
                    <li><strong>Titular legal (MEI):</strong> {EMPRESA.titularLegal}</li>
                    <li><strong>Marca do produto:</strong> {EMPRESA.marca}™</li>
                    <li><strong>Marca de serviços:</strong> {EMPRESA.marcaCasa}™</li>
                    <li><strong>CNPJ:</strong> {EMPRESA.cnpj}</li>
                    <li><strong>Encarregado de Dados (DPO) / Privacidade:</strong>{' '}
                        <a href={`mailto:${EMPRESA.emailSuporte}`}>{EMPRESA.emailSuporte}</a>
                    </li>
                    <li><strong>Telefone:</strong> {EMPRESA.telefone}</li>
                    <li><strong>Endereço:</strong> {enderecoCompleto}</li>
                    <li><strong>Website:</strong>{' '}
                        <a href={EMPRESA.website} target="_blank" rel="noopener noreferrer">{EMPRESA.website}</a>
                    </li>
                </ul>
                <p>
                    Documentos relacionados:{' '}
                    <Link to="/termos-de-uso">Termos de Uso</Link>,{' '}
                    <Link to="/politica-cookies">Política de Cookies</Link>.
                </p>
                <p>
                    Ao utilizar o {EMPRESA.nome}, você declara ter lido e compreendido esta Política de Privacidade
                    na íntegra.
                </p>
            </SecaoLegal>
        </PaginaLegal>
    );
}
