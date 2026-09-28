import { Link } from 'react-router-dom';
import { EMPRESA } from '../config/empresa';
import PaginaLegal, { SecaoLegal, AlertaLegal, type SecaoLegal as SecaoIndice } from '../components/PaginaLegal';

const secoes: SecaoIndice[] = [
    { id: 'intro', label: '1. Introdução' },
    { id: 'definicoes', label: '2. Definições' },
    { id: 'servico', label: '3. Natureza do Serviço' },
    { id: 'cadastro', label: '4. Cadastro e Conta' },
    { id: 'plano-gratuito', label: '5. Plano Gratuito' },
    { id: 'planos-pagos', label: '6. Planos e Preços' },
    { id: 'stripe', label: '7. Pagamentos (Stripe)' },
    { id: 'contratacao', label: '8. Contratação e Cancelamento' },
    { id: 'alteracao-precos', label: '9. Alteração de Preços' },
    { id: 'responsabilidades', label: '10. Responsabilidades' },
    { id: 'uso-aceitavel', label: '11. Uso Aceitável' },
    { id: 'propriedade', label: '12. Propriedade Intelectual' },
    { id: 'disponibilidade', label: '13. Disponibilidade' },
    { id: 'suspensao', label: '14. Suspensão e Encerramento' },
    { id: 'limitacao', label: '15. Limitação de Responsabilidade' },
    { id: 'indenizacao', label: '16. Indenização' },
    { id: 'privacidade', label: '17. Privacidade' },
    { id: 'alteracoes', label: '18. Alterações' },
    { id: 'disposicoes', label: '19. Disposições Gerais' },
    { id: 'foro', label: '20. Foro e Contato' },
];

const DATA_ATUALIZACAO = '24/09/2026';
const VERSAO = '3.0.0';

export default function TermosDeUso() {
    const enderecoCompleto = `${EMPRESA.rua}, nº ${EMPRESA.numero} — ${EMPRESA.cidade}/${EMPRESA.estado}, CEP ${EMPRESA.cep}`;

    return (
        <PaginaLegal
            titulo="Termos de Uso e Condições Gerais"
            subtitulo={`Versão ${VERSAO} — Atualizado em ${DATA_ATUALIZACAO}`}
            secoes={secoes}
            secaoInicial="intro"
        >
            <SecaoLegal id="intro">
                <h2>1. Introdução e Aceite Contratual</h2>
                <p>
                    Estes Termos de Uso e Condições Gerais (&quot;Termos&quot;) regulam o acesso e a utilização da plataforma
                    digital <strong>{EMPRESA.marca}</strong>™, operada sob o CNPJ nº <strong>{EMPRESA.cnpj}</strong> (MEI),
                    cujo titular legal é <strong>{EMPRESA.titularLegal}</strong>, com sede em {enderecoCompleto}
                    (&quot;Nós&quot;, &quot;Nosso&quot;, &quot;Prestador&quot;, &quot;Titular&quot; ou &quot;Operador da Plataforma&quot;).
                </p>
                <p>
                    Na interface do produto e materiais de divulgação, o serviço é apresentado pela marca{' '}
                    <strong>{EMPRESA.marca}</strong>™. A marca de serviços <strong>{EMPRESA.marcaCasa}</strong>™ identifica
                    a operação comercial vinculada ao mesmo titular. O nome completo do Titular consta neste documento e
                    na Política de Privacidade para fins legais (transparência, LGPD e identificação do prestador), sem
                    necessidade de destaque em páginas de marketing.
                </p>
                <p>
                    Ao acessar, navegar, criar conta, contratar plano ou utilizar qualquer funcionalidade do sistema,
                    você (&quot;Usuário&quot;, &quot;Assinante&quot;, &quot;Contratante&quot; ou &quot;Cliente&quot;) declara ter lido,
                    compreendido e aceito integralmente o presente instrumento, bem como a nossa{' '}
                    <Link to="/politica-privacidade">Política de Privacidade</Link> e a nossa{' '}
                    <Link to="/politica-cookies">Política de Cookies</Link>, que integram e complementam estes Termos
                    para todos os fins de direito.
                </p>
                <p>
                    Caso você não concorde com qualquer disposição aqui prevista, deverá abster-se imediatamente de utilizar
                    a plataforma. O uso continuado após eventuais alterações constitui aceite tácito e irrevogável das novas
                    condições, na forma descrita na Seção 18 deste documento.
                </p>
                <AlertaLegal titulo="AVISO IMPORTANTE — LEIA COM ATENÇÃO:">
                    A plataforma {EMPRESA.marca}™ é uma ferramenta de apoio à gestão da CIPA: mandato, membros,
                    reuniões, atas e o processo eleitoral da NR-05. Ela <strong>não substitui</strong> as obrigações da
                    organização perante a norma, o sindicato e a fiscalização. Atas, editais e registros gerados no
                    sistema servem à organização interna e só têm o valor que a organização lhes der ao assinar, publicar
                    e arquivar conforme a NR-05.
                </AlertaLegal>
            </SecaoLegal>

            <SecaoLegal id="definicoes">
                <h2>2. Definições</h2>
                <p>Para fins de interpretação destes Termos, consideram-se as seguintes definições:</p>
                <ul>
                    <li><strong>Plataforma ou Sistema:</strong> o software {EMPRESA.nome}, incluindo site, painel web, APIs, integrações e demais funcionalidades disponibilizadas pelo Prestador.</li>
                    <li><strong>Usuário ou Assinante:</strong> pessoa física ou jurídica que cria conta, contrata plano ou utiliza a plataforma em nome próprio ou de terceiros.</li>
                    <li><strong>Plano Gratuito (Free):</strong> modalidade de uso sem cobrança recorrente, sujeita a limitações funcionais e exibição de publicidade, conforme Seção 5.</li>
                    <li><strong>Plano Pago ou Assinatura:</strong> modalidade contratada mediante pagamento recorrente ou avulso (ex.: Pro ou Gestor), com recursos e limites ampliados conforme a matriz comercial vigente e a página de planos.</li>
                    <li><strong>Stripe:</strong> prestador de serviços de pagamento terceirizado responsável pelo processamento de cobranças, gestão de assinaturas e dados financeiros vinculados ao cartão de crédito ou demais meios aceitos.</li>
                    <li><strong>Projeto:</strong> unidade lógica de organização dentro da plataforma (empresa, obra, filial ou similar) vinculada à conta do Assinante.</li>
                    <li><strong>Membro:</strong> titular, suplente ou reservista da CIPA cadastrado pelo Assinante no projeto.</li>
                    <li><strong>Convidado:</strong> pessoa que recebe acesso à conta para ajudar na gestão, sem ser necessariamente membro da comissão.</li>
                    <li><strong>Dados Inseridos:</strong> qualquer informação, registro, documento ou conteúdo fornecido pelo Usuário ou por seus representantes na plataforma.</li>
                </ul>
            </SecaoLegal>

            <SecaoLegal id="servico">
                <h2>3. Objeto, Escopo e Natureza do Serviço</h2>
                <p>
                    O objeto destes Termos é regular a licença de uso não exclusiva, intransferível, revogável e limitada
                    da plataforma {EMPRESA.nome}, destinada a organizar a gestão da CIPA: vigência do mandato, membros,
                    reuniões com ata, ações com prazo e o calendário da eleição previsto na NR-05.
                </p>
                <p>
                    O Sistema é oferecido no modelo <em>Software as a Service</em> (SaaS), acessível via internet,
                    podendo sofrer atualizações, melhorias, correções e alterações de interface a qualquer tempo, com ou
                    sem aviso prévio, desde que não contrarie disposições legais imperativas ou cláusulas expressamente
                    acordadas em contrato específico divergente destes Termos.
                </p>
                <h3>3.1. Finalidade exclusivamente administrativa</h3>
                <p>
                    Todos os relatórios, dashboards, alertas, exportações, históricos e registros produzidos pela plataforma
                    destinam-se exclusivamente à <strong>análise gerencial e controle operacional interno</strong> do Assinante.
                    Em nenhuma hipótese devem ser interpretados como laudo técnico, parecer jurídico, certificação oficial,
                    comprovante autônomo perante a fiscalização ou substituto da NR-05, de convenção coletiva ou de
                    qualquer outro diploma legal.
                </p>
                <h3>3.2. O que continua com a organização</h3>
                <p>
                    Permanece integral e exclusivamente sob responsabilidade do Assinante — e não do Prestador —
                    cumprir a NR-05: constituir a comissão quando exigida, comunicar o sindicato da categoria preponderante,
                    realizar a eleição no prazo, lavrar e guardar atas, treinar titulares e suplentes e manter os
                    documentos que a norma e a fiscalização pedirem. A plataforma organiza essas etapas e oferece modelos
                    para edição e impressão. Ela não envia o documento ao sindicato nem à inspeção do trabalho no lugar
                    da organização.
                </p>
            </SecaoLegal>

            <SecaoLegal id="cadastro">
                <h2>4. Cadastro, Elegibilidade e Segurança da Conta</h2>
                <p>
                    Para utilizar a plataforma, o Usuário deverá fornecer informações verdadeiras, completas e atualizadas
                    no momento do cadastro. O Assinante declara possuir capacidade civil e, quando agir em nome de pessoa
                    jurídica, poderes legais para vincular a empresa contratante a estes Termos.
                </p>
                <p>
                    O login, senha e demais credenciais de acesso são pessoais e intransferíveis. Qualquer atividade
                    realizada mediante suas credenciais será presumida como autorizada pelo titular da conta, salvo
                    comunicação imediata de uso indevido ao suporte ({EMPRESA.emailSuporte}).
                </p>
                <p>
                    É vedado compartilhar credenciais com terceiros não autorizados, ceder contas, revender acesso ou
                    permitir uso por pessoas não vinculadas ao projeto cadastrado. O Prestador poderá solicitar documentos
                    comprobatórios a qualquer momento para verificação de identidade ou legitimidade do cadastro.
                </p>
                <h3>4.1. Cadastro na modalidade Autônomo</h3>
                <p>
                    Usuários que optarem pelo cadastro como <strong>Autônomo</strong> (pessoa física, uso individual)
                    declaram que os dados informados na criação da conta e os que eventualmente inserirem posteriormente
                    na plataforma (inclusive membros da CIPA, reuniões e documentos da eleição)
                    são fornecidos de forma <strong>voluntária</strong>, por iniciativa própria, para organizar a gestão
                    da comissão.
                </p>
                <p>
                    O Autônomo reconhece ser exclusivamente responsável por possuir base legal adequada quando inserir
                    dados de terceiros, bem como por informar tais titulares sobre o tratamento, nos termos da LGPD e
                    demais normas aplicáveis. O cadastro pede nome, contato e, quando houver, dados da gestão — não
                    pede CPF de empregado como requisito para usar a plataforma.
                </p>
            </SecaoLegal>

            <SecaoLegal id="plano-gratuito">
                <h2>5. Plano Gratuito e Publicidade</h2>
                <p>
                    A plataforma poderá disponibilizar um <strong>Plano Gratuito (Iniciante)</strong>, mediante cadastro,
                    sujeito ao limite de quantidade de projetos do plano, a funcionalidades da gestão da CIPA e
                    restrições operacionais, conforme definido unilateralmente pelo Prestador e informado no próprio
                    sistema, na página <Link to="/upgrade">/upgrade</Link> ou na seção de planos do site.
                </p>
                <p>
                    No Plano Iniciante, a conta inclui um projeto e a gestão da CIPA desse projeto: vigência, membros,
                    reuniões, atas, ações e o calendário da eleição. Planos pagos ampliam a quantidade de projetos,
                    conforme a página de planos. O plano gratuito não inclui recursos que a página de planos marcar
                    como exclusivos de plano pago.
                </p>
                <p>
                    O uso gratuito (plano Iniciante) e a visita à página inicial estão sujeitos à{' '}
                    <strong>exibição de anúncios automáticos do Google AdSense</strong>, bem como a banners ou
                    materiais promocionais próprios, inclusive em documentos impressos quando aplicável. Em planos
                    pagos, a área autenticada da plataforma não carrega o script de anúncios.
                </p>
                <p>
                    Ao optar pelo Plano Gratuito, o Usuário reconhece e aceita que:
                </p>
                <ul>
                    <li>a publicidade faz parte integrante da experiência do plano Iniciante e da home pública, não sendo possível desativá-la no painel sem migrar para plano pago ou negar cookies de publicidade no banner;</li>
                    <li>anúncios podem ser alterados, rotacionados ou removidos a critério do Prestador ou do Google AdSense;</li>
                    <li>cliques em anúncios ou interações com conteúdo patrocinado podem direcionar a sites externos, cujos termos e políticas são de responsabilidade exclusiva dos respectivos titulares;</li>
                    <li>o Prestador não garante ausência de interrupções publicitárias nem compatibilidade com bloqueadores de anúncios — o uso de tais ferramentas pode limitar funcionalidades.</li>
                </ul>
                <p>
                    O Prestador reserva-se o direito de modificar, suspender ou encerrar o Plano Gratuito a qualquer
                    momento, inclusive convertendo contas gratuitas em planos pagos mediante aviso razoável, sem que
                    isso gere direito a indenização.
                </p>
            </SecaoLegal>

            <SecaoLegal id="planos-pagos">
                <h2>6. Planos Pagos, Preços e Recursos</h2>
                <p>
                    Além do Plano Gratuito, a plataforma oferece <strong>planos de assinatura pagos</strong> (notadamente
                    <strong> Pro</strong> e <strong>Gestor</strong>), com funcionalidades, limites e valores distintos.
                    A relação atualizada de planos, preços, periodicidade (mensal, anual ou outra), benefícios inclusos e
                    comparativo entre modalidades encontra-se disponível na página <Link to="/upgrade">/upgrade</Link>
                    (&quot;Planos e Preços&quot;), acessível também após login no painel do sistema e na seção de planos
                    do site institucional.
                </p>
                <p>
                    Sem prejuízo da página de planos (que prevalece em caso de divergência comercial), a matriz de recursos
                    vigente contempla, de forma resumida:
                </p>
                <ul>
                    <li>
                        <strong>Pro:</strong> mais projetos do que o Iniciante, com a mesma gestão da CIPA (mandato,
                        membros, reuniões, eleição e documentos), sem a publicidade do plano gratuito.
                    </li>
                    <li>
                        <strong>Gestor:</strong> a maior quantidade de projetos do quadro vigente, com a mesma gestão
                        da CIPA e a possibilidade de convidar outras pessoas para a conta.
                    </li>
                </ul>
                <p>
                    O <strong>limite numérico</strong> acompanhado pelo plano é a quantidade de projetos. Ele é
                    definidos nas regras do plano contratado (<em>plano_regras</em>) e podem variar independentemente da
                    liberação de recursos funcionais descritos acima.
                </p>
                <p>
                    Os valores exibidos em <Link to="/upgrade">/upgrade</Link> prevalecem sobre qualquer informação
                    desatualizada em materiais promocionais, e-mails antigos ou comunicações anteriores. Impostos,
                    taxas bancárias ou encargos de câmbio, quando aplicáveis, podem ser acrescidos conforme legislação
                    ou política do processador de pagamentos.
                </p>
                <p>
                    A contratação de plano pago implica aceite automático do valor vigente no momento da confirmação
                    da assinatura, bem como das condições específicas do plano escolhido (limites de uso, recursos
                    liberados, suporte etc.), descritas na referida página.
                </p>
            </SecaoLegal>

            <SecaoLegal id="stripe">
                <h2>7. Pagamentos, Faturamento e Gestão via Stripe</h2>
                <p>
                    O controle financeiro das assinaturas pagas é realizado integralmente por meio do serviço
                    <strong> Stripe, Inc.</strong> (&quot;Stripe&quot;), prestador terceirizado especializado em
                    processamento de pagamentos. Ao contratar um plano pago, o Usuário concorda também com os termos,
                    políticas e condições do Stripe aplicáveis à sua região.
                </p>
                <h3>7.1. Dados de pagamento</h3>
                <p>
                    Informações de cartão de crédito, débito ou demais meios de pagamento são coletadas e processadas
                    diretamente pelo Stripe. O Prestador <strong>não armazena</strong> números completos de
                    cartão, CVV ou dados sensíveis de pagamento em seus próprios servidores.
                </p>
                <h3>7.2. Cobrança recorrente</h3>
                <p>
                    Assinaturas pagas são, em regra, cobradas de forma recorrente e automática na periodicidade do plano
                    contratado, até cancelamento efetivo. Falhas de cobrança (cartão expirado, saldo insuficiente,
                    recusa da operadora) podem resultar em suspensão temporária ou downgrade automático para Plano
                    Gratuito, perda de funcionalidades premium ou bloqueio de acesso, sem direito a compensação pelo
                    período não utilizado.
                </p>
                <h3>7.3. Notas fiscais e comprovantes</h3>
                <p>
                    Comprovantes de transação e recibos podem ser disponibilizados pelo Stripe ou pelo Prestador conforme
                    procedimentos internos. Eventuais solicitações de documentos fiscais devem ser encaminhadas ao suporte,
                    observados prazos legais e dados cadastrais corretos fornecidos pelo Assinante.
                </p>
            </SecaoLegal>

            <SecaoLegal id="contratacao">
                <h2>8. Contratação, Renovação, Upgrade, Downgrade e Cancelamento</h2>
                <h3>8.1. Contratação</h3>
                <p>
                    A contratação de planos pagos é realizada eletronicamente, mediante seleção do plano em{' '}
                    <Link to="/upgrade">/upgrade</Link>, confirmação dos dados e autorização de cobrança no Stripe.
                    O contrato considera-se firmado no momento da confirmação bem-sucedida do pagamento ou do período
                    de trial, quando oferecido.
                </p>
                <h3>8.2. Renovação automática</h3>
                <p>
                    Salvo cancelamento prévio, as assinaturas renovam-se automaticamente ao final de cada ciclo de
                    faturamento, pelo valor então vigente (sujeito à Seção 9 sobre alteração de preços).
                </p>
                <h3>8.3. Upgrade e downgrade</h3>
                <p>
                    O Assinante pode solicitar upgrade para plano superior conforme opções disponíveis no painel.
                    Downgrades (incluso retorno ao Plano Gratuito) podem estar sujeitos a perda imediata de recursos
                    premium, redução de limites e necessidade de adequação dos dados armazenados aos novos limites do plano.
                </p>
                <h3>8.4. Cancelamento pelo Assinante</h3>
                <p>
                    O cancelamento pode ser solicitado pelo próprio Usuário por meio das ferramentas disponibilizadas
                    no painel ou portal de gestão do Stripe, conforme aplicável. Salvo disposição expressa em contrário:
                </p>
                <ul>
                    <li>o cancelamento produz efeitos ao final do período já pago, mantendo-se o acesso até o término do ciclo vigente;</li>
                    <li>não há reembolso proporcional de valores já faturados, exceto quando exigido por lei;</li>
                    <li>após o encerramento, os dados poderão ser mantidos por prazo limitado (conforme Seção 14.3) e posteriormente excluídos.</li>
                </ul>
                <h3>8.5. Cancelamento pelo Prestador</h3>
                <p>
                    Reservamo-nos o direito de cancelar, suspender ou não renovar qualquer assinatura, a nosso exclusivo
                    critério, inclusive <strong>sem aviso prévio</strong>, nas hipóteses previstas nestes Termos ou quando
                    houver inadimplência, fraude, violação de uso aceitável ou risco à segurança da plataforma.
                </p>
            </SecaoLegal>

            <SecaoLegal id="alteracao-precos">
                <h2>9. Alteração de Preços, Planos e Funcionalidades</h2>
                <p>
                    O Prestador poderá, a qualquer tempo, alterar preços, nomenclaturas, limites, recursos incluídos,
                    estrutura de planos ou política comercial da plataforma.
                </p>
                <p>
                    Quanto a <strong>alterações de preço</strong> de planos já contratados, envidaremos esforços para
                    comunicar o Assinante com antecedência razoável por e-mail cadastrado, aviso no painel ou outro meio
                    eletrônico, antes que a nova tarifa passe a valer na próxima renovação. A continuidade do uso após
                    o início do novo ciclo de cobrança constituirá aceite do valor atualizado.
                </p>
                <p>
                    Alterações substanciais de funcionalidades, descontinuação de módulos ou migração obrigatória entre
                    planos poderão ser implementadas mediante aviso prévio, salvo quando exigidas por motivos de segurança,
                    cumprimento legal ou força maior, hipóteses em que a comunicação poderá ser posterior ou dispensada.
                </p>
                <p>
                    Promoções, descontos, cupons ou condições especiais são temporários, não cumulativos salvo expressa
                    indicação, e podem ser revogados unilateralmente.
                </p>
            </SecaoLegal>

            <SecaoLegal id="responsabilidades">
                <h2>10. Responsabilidades do Usuário e do Prestador</h2>
                <h3>10.1. Responsabilidades do Assinante (Usuário)</h3>
                <p>O Assinante é o único e exclusivo responsável por:</p>
                <ul>
                    <li>veracidade, completude, legalidade e atualização de todos os Dados Inseridos na plataforma;</li>
                    <li>obter consentimentos, autorizações e bases legais necessárias para tratamento de dados pessoais de membros da CIPA, convidados e terceiros, nos termos da LGPD;</li>
                    <li>cumprir a NR-05 e guardar atas, editais e demais documentos exigidos pela norma e pela fiscalização;</li>
                    <li>decisões administrativas, disciplinares, contratuais ou de segurança do trabalho tomadas com base em relatórios ou alertas do sistema;</li>
                    <li>backup externo de informações críticas, quando necessário à sua operação;</li>
                    <li>conformidade com obrigações trabalhistas, previdenciárias, tributárias e de saúde e segurança ocupacional de sua organização;</li>
                    <li>garantir que usuários vinculados à sua conta (gestores e convidados) utilizem a plataforma de acordo com estes Termos.</li>
                </ul>
                <AlertaLegal titulo="RESPONSABILIDADE SOBRE A NR-05:">
                    A plataforma organiza a gestão da CIPA e oferece modelos de documento. A obrigação de realizar a
                    eleição no prazo, comunicar o sindicato, lavrar atas e arquivar o que a norma exige permanece{' '}
                    <strong>sob responsabilidade da organização</strong>. Um registro feito só na tela não dispensa o
                    documento que a NR-05 pede fora do sistema.
                </AlertaLegal>
                <h3>10.2. Responsabilidades do Prestador</h3>
                <p>
                    O Prestador compromete-se a empregar esforços comercialmente razoáveis para manter a
                    plataforma operacional, segura e atualizada, sem garantir disponibilidade ininterrupta, ausência
                    total de erros ou adequação a finalidades específicas do Assinante além daquelas descritas nestes Termos.
                </p>
            </SecaoLegal>

            <SecaoLegal id="uso-aceitavel">
                <h2>11. Uso Aceitável e Condutas Proibidas</h2>
                <p>É expressamente proibido ao Usuário:</p>
                <ul>
                    <li>utilizar a plataforma para fins ilícitos, fraudulentos ou que violem direitos de terceiros;</li>
                    <li>inserir dados falsos, difamatórios ou sem autorização do titular;</li>
                    <li>tentar acessar áreas restritas, realizar engenharia reversa, copiar código-fonte ou contornar limites técnicos;</li>
                    <li>sobrecarregar intencionalmente a infraestrutura (ataques DDoS, scraping abusivo, bots não autorizados);</li>
                    <li>revender, sublicenciar ou disponibilizar o sistema a terceiros não previstos no plano contratado;</li>
                    <li>remover avisos de propriedade intelectual ou violar direitos autorais de materiais disponibilizados.</li>
                </ul>
                <p>
                    O descumprimento poderá ensejar suspensão imediata, cancelamento sem reembolso e medidas legais cabíveis.
                </p>
            </SecaoLegal>

            <SecaoLegal id="propriedade">
                <h2>12. Propriedade Intelectual e Marcas</h2>
                <p>
                    <strong>{EMPRESA.marca}</strong>™ é marca de serviço/software utilizada para identificar esta plataforma.
                    <strong> {EMPRESA.marcaCasa}</strong>™ é marca de serviços utilizada para identificar a operação comercial
                    do Titular (incluindo site e comunicações em {EMPRESA.website.replace(/^https?:\/\//, '')}). O símbolo ™
                    indica marca em uso e <strong>não afirma</strong>, por si só, registro no INPI.
                </p>
                <p>
                    O código-fonte, a interface, os textos, a documentação, os algoritmos, o layout, logotipos e demais
                    elementos originais da plataforma são de titularidade do Prestador (ou de licenciadores, quando
                    aplicável) e protegidos pela legislação brasileira de direitos autorais e de programa de computador
                    (Leis nº 9.610/1998 e nº 9.609/1998), independentemente de registro de programa ou de marca.
                </p>
                <p>
                    É vedado usar as marcas {EMPRESA.marca} e {EMPRESA.marcaCasa}, logotipos ou elementos visuais do serviço
                    de modo que sugira vínculo, endosso ou origem de terceiros, ou que cause confusão quanto à titularidade
                    ou ao prestador do serviço.
                </p>
                <p>
                    Estes Termos não concedem licença para copiar, modificar, redistribuir, sublicenciar, fazer engenharia
                    reversa, descompilar ou explorar comercialmente o software além do uso normal do serviço conforme aqui
                    descrito. Todos os direitos não expressamente concedidos ficam reservados ao Prestador.
                </p>
                <p>
                    Os Dados Inseridos pelo Assinante permanecem de sua titularidade ou de titularidade dos respectivos
                    sujeitos de dados, conforme LGPD. O Assinante concede ao Prestador licença limitada para hospedar,
                    processar, exibir e backup dos dados exclusivamente para prestação do serviço contratado.
                </p>
            </SecaoLegal>

            <SecaoLegal id="disponibilidade">
                <h2>13. Disponibilidade, Manutenção, Falhas e Isenção de Gestão</h2>
                <p>
                    A plataforma depende de serviços de internet, hospedagem, provedores de nuvem e integrações de
                    terceiros. Interrupções, lentidão, perda temporária de dados, falhas de sincronização, indisponibilidade
                    de APIs externas ou erros de software podem ocorrer, mesmo com medidas preventivas adotadas.
                </p>
                <p>
                    Manutenções programadas ou emergenciais poderão ser realizadas a qualquer momento, preferencialmente
                    com comunicação prévia quando viável, sem que isso caracterize descumprimento contratual.
                </p>
                <p>
                    A <strong>gestão da CIPA, a decisão de iniciar a eleição, a comunicação ao sindicato e o cumprimento
                    da NR-05</strong> são de responsabilidade exclusiva do Assinante. A falha ou
                    indisponibilidade temporária da plataforma não transfere ao Prestador a obrigação de executar a gestão
                    do cliente nem de suprir processos internos do Assinante.
                </p>
                <AlertaLegal titulo="LIMITAÇÃO SOBRE FALHAS DE FORNECIMENTO:">
                    Eventuais falhas no fornecimento do serviço digital — incluindo bugs, indisponibilidade, perda parcial
                    de dados ou impossibilidade de acesso — não geram, por si sós, responsabilidade do Prestador pela
                    gestão, controle ou conformidade legal das operações do Usuário. O Assinante deve manter procedimentos
                    alternativos de controle compatíveis com sua realidade operacional.
                </AlertaLegal>
            </SecaoLegal>

            <SecaoLegal id="suspensao">
                <h2>14. Suspensão, Bloqueio, Exclusão de Assinatura e Encerramento do Sistema</h2>
                <h3>14.1. Medidas unilaterais</h3>
                <p>
                    Reservamo-nos o direito, a nosso exclusivo critério e <strong>sem necessidade de aviso prévio</strong>,
                    de suspender, bloquear, restringir funcionalidades ou excluir permanentemente qualquer conta ou assinatura,
                    inclusive planos pagos, nas seguintes hipóteses (lista exemplificativa, não exaustiva):
                </p>
                <ul>
                    <li>violação destes Termos ou de políticas complementares;</li>
                    <li>suspeita de fraude, chargeback abusivo ou uso indevido de meios de pagamento;</li>
                    <li>atividades que comprometam a segurança, estabilidade ou reputação da plataforma;</li>
                    <li>determinação judicial ou requisição de autoridade competente;</li>
                    <li>inadimplência ou impossibilidade de cobrança via Stripe;</li>
                    <li>cadastro com informações falsas ou impersonação.</li>
                </ul>
                <h3>14.2. Encerramento total do serviço</h3>
                <p>
                    O Prestador reserva-se o direito de <strong>descontinuar, encerrar ou desativar
                    integralmente a plataforma {EMPRESA.nome}, no todo ou em parte, a qualquer momento e sem aviso
                    prévio</strong>, por motivos comerciais, técnicos, legais ou de força maior, sem que tal decisão
                    implique, salvo disposição legal imperativa em contrário, obrigação de continuidade do serviço,
                    migração de dados ou indenização por lucros cessantes.
                </p>
                <h3>14.3. Retenção e exclusão de dados após cancelamento</h3>
                <p>
                    Após cancelamento, suspensão ou encerramento de conta, os dados poderão ser mantidos por prazo
                    limitado (em regra, até 30 dias) para eventual exportação ou recuperação solicitada pelo Assinante,
                    salvo obrigação legal de retenção por período superior. Decorrido o prazo, os registros poderão ser
                    excluídos de forma permanente e irreversível, sem possibilidade de restauração.
                </p>
            </SecaoLegal>

            <SecaoLegal id="limitacao">
                <h2>15. Limitação de Responsabilidade e Exclusão de Garantias</h2>
                <p>
                    Na máxima extensão permitida pela legislação aplicável, a plataforma é fornecida &quot;no estado em
                    que se encontra&quot; (<em>as is</em>) e &quot;conforme disponível&quot; (<em>as available</em>),
                    sem garantias expressas ou implícitas de adequação a finalidade específica, resultados comerciais,
                    ausência de vícios ou compatibilidade ininterrupta com todos os dispositivos e navegadores.
                </p>
                <p>
                    Em nenhuma hipótese o Prestador, seus sócios, administradores, colaboradores, parceiros
                    ou fornecedores serão responsáveis por:
                </p>
                <ul>
                    <li>danos indiretos, incidentais, especiais, punitivos ou consequenciais;</li>
                    <li>lucros cessantes, perda de receita, perda de dados ou interrupção de negócios;</li>
                    <li>multas, penalidades ou autuações aplicadas a órgãos fiscalizadores em razão de descumprimento de obrigações do Assinante;</li>
                    <li>decisões tomadas com base em relatórios, alertas ou exportações gerados pelo sistema;</li>
                    <li>atos ou omissões de terceiros, incluindo Stripe, provedores de nuvem, redes de anúncios ou operadoras de telecomunicações.</li>
                </ul>
                <p>
                    Quando a limitação acima for considerada inválida, a responsabilidade total cumulativa do Prestador
                    perante o Assinante, por qualquer causa relacionada a estes Termos, ficará limitada ao montante efetivamente
                    pago pelo Assinante nos últimos 12 (doze) meses anteriores ao evento que originou a reclamação, ou
                    R$ 100,00 (cem reais), o que for maior — salvo dolo ou culpa grave devidamente comprovados.
                </p>
            </SecaoLegal>

            <SecaoLegal id="indenizacao">
                <h2>16. Indenização</h2>
                <p>
                    O Assinante concorda em indenizar, defender e isentar o Prestador, suas afiliadas e
                    respectivos representantes de quaisquer reclamações, perdas, danos, custos e despesas (incluindo
                    honorários advocatícios razoáveis) decorrentes de: (i) Dados Inseridos ou tratados em desconformidade
                    com a lei; (ii) violação destes Termos; (iii) violação de direitos de terceiros; ou (iv) uso indevido
                    da plataforma por si ou por pessoas vinculadas à sua conta.
                </p>
            </SecaoLegal>

            <SecaoLegal id="privacidade">
                <h2>17. Privacidade e Proteção de Dados</h2>
                <p>
                    O tratamento de dados pessoais realizado em conexão com a plataforma rege-se pela nossa{' '}
                    <Link to="/politica-privacidade">Política de Privacidade</Link>, que descreve bases legais, papéis
                    de controlador e operador na LGPD, compartilhamentos e direitos dos titulares.
                </p>
                <p>
                    Para fins de esclarecimento nestes Termos: o Assinante é, em regra, o <strong>Controlador</strong> dos
                    dados dos membros da CIPA e dos convidados que cadastrar; o Prestador atua como <strong>Operadora</strong>, processando
                    dados conforme instruções do Assinante e para execução do serviço contratado.
                </p>
            </SecaoLegal>

            <SecaoLegal id="alteracoes">
                <h2>18. Alterações destes Termos</h2>
                <p>
                    Podemos revisar, atualizar ou substituir estes Termos periodicamente. A versão vigente será indicada
                    pelo número de versão e data de atualização no topo desta página. Alterações materiais poderão ser
                    comunicadas por e-mail, aviso no painel ou banner na plataforma.
                </p>
                <p>
                    O uso continuado após a publicação de alterações constitui aceite das novas condições. Se você
                    discordar de modificação substancial, deverá encerrar sua conta e cessar o uso antes que as novas
                    disposições produzam efeitos sobre sua assinatura renovada.
                </p>
            </SecaoLegal>

            <SecaoLegal id="disposicoes">
                <h2>19. Disposições Gerais</h2>
                <ul>
                    <li><strong>Integralidade:</strong> estes Termos, juntamente com políticas referenciadas, constituem o acordo integral entre as partes sobre o objeto aqui tratado.</li>
                    <li><strong>Independência das cláusulas:</strong> a invalidade de qualquer disposição não afeta as demais, que permanecerão em pleno vigor.</li>
                    <li><strong>Tolerância:</strong> eventual tolerância quanto ao descumprimento não implica renúncia de direito.</li>
                    <li><strong>Cessão:</strong> o Assinante não pode ceder seus direitos sem consentimento prévio por escrito. O Prestador pode ceder ou transferir estes Termos em caso de reorganização societária ou venda do negócio.</li>
                    <li><strong>Comunicações:</strong> notificações ao Assinante poderão ser enviadas ao e-mail cadastrado ou exibidas no painel, consideradas entregues na data de envio ou publicação.</li>
                    <li><strong>Idioma:</strong> estes Termos são redigidos em português (Brasil). Traduções, se houver, servem apenas para conveniência; prevalece a versão em português.</li>
                </ul>
            </SecaoLegal>

            <SecaoLegal id="foro">
                <h2>20. Legislação Aplicável, Foro e Contato</h2>
                <p>
                    Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
                    comarca de <strong>{EMPRESA.cidade}/{EMPRESA.estado}</strong>, com renúncia a qualquer outro,
                    por mais privilegiado que seja, para dirimir controvérsias oriundas deste instrumento, salvo
                    disposições legais imperativas em contrário aplicáveis a relações de consumo.
                </p>
                <p>
                    Dúvidas, solicitações ou comunicações relacionadas a estes Termos podem ser encaminhadas para:
                </p>
                <ul>
                    <li><strong>Titular legal (MEI):</strong> {EMPRESA.titularLegal}</li>
                    <li><strong>Marca do produto:</strong> {EMPRESA.marca}™</li>
                    <li><strong>Marca de serviços:</strong> {EMPRESA.marcaCasa}™</li>
                    <li><strong>CNPJ:</strong> {EMPRESA.cnpj}</li>
                    <li><strong>E-mail:</strong> <a href={`mailto:${EMPRESA.emailSuporte}`}>{EMPRESA.emailSuporte}</a></li>
                    <li><strong>Telefone:</strong> {EMPRESA.telefone}</li>
                    <li><strong>Endereço:</strong> {enderecoCompleto}</li>
                    <li><strong>Website:</strong> <a href={EMPRESA.website} target="_blank" rel="noopener noreferrer">{EMPRESA.website}</a></li>
                </ul>
                <p>
                    Ao utilizar o {EMPRESA.nome}, você reconhece ter lido integralmente este documento, compreendido
                    suas disposições — inclusive aquelas que limitam direitos e responsabilidades — e concordado em
                    vincular-se a todas as cláusulas aqui estabelecidas.
                </p>
            </SecaoLegal>
        </PaginaLegal>
    );
}
