import { useState } from 'react';
import { BRAND } from '../../../lib/brandAssets';
import { EMPRESA } from '../../../config/empresa';
import { enviarContatoEmail } from '../../../lib/contatoEmailService';
import { Link } from 'react-router-dom';
// Interface para as propriedades enviadas pelo componente pai
interface RodapeProps {
  onOpenModal: (mode: 'login' | 'cadastro') => void;
  onScrollToSection: (id: string) => void;
}

const Rodape: React.FC<RodapeProps> = ({ onOpenModal, onScrollToSection }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email_address: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleFooterContact = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await enviarContatoEmail({
        from_name: formData.full_name,
        reply_to: formData.email_address,
        message: formData.message,
      });
      alert('Mensagem enviada com sucesso!');
      setFormData({ full_name: '', email_address: '', message: '' });
    } catch (error) {
      console.error('Erro ao enviar:', error);
      alert('Ocorreu um erro ao enviar a mensagem. Tente novamente.');
    }
  };

  const handleNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    onScrollToSection(id);
  };

  const handleModalClick = (e: React.MouseEvent, mode: 'login' | 'cadastro') => {
    e.preventDefault();
    onOpenModal(mode);
  };

  return (
    <footer id="footer-section">
      <div className="bg-squares" style={{ opacity: 0.2 }}></div>
      <div className="footer-inner">

        {/* Brand & Social */}
        <div className="footer-brand">
          <div className="footer-logo">
            <div className="footer-logo-icon">
              <img
                src={BRAND.logotipo}
                alt={BRAND.name}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>
            <span className="footer-logo-text">CIPA <span>Fácil</span></span>
          </div>
          <p className="footer-desc">
            Gestão da CIPA em um só lugar: mandato, reuniões, eleição e os prazos da NR-05.
          </p>

          {/* Identificação pública: marcas + CNPJ (nome do MEI só nas páginas legais) */}
          <div style={{ marginTop: '20px', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.6' }}>
            <p><strong>{EMPRESA.marca}™</strong></p>
            <p>CNPJ: {EMPRESA.cnpj}</p>
            <p>{EMPRESA.rua}, {EMPRESA.numero}</p>
            <p>{EMPRESA.cidade} - {EMPRESA.estado} | CEP: {EMPRESA.cep}</p>
            <p style={{ marginTop: '10px', fontSize: '0.78rem', color: '#94a3b8' }}>
              {EMPRESA.marcaCasa}™ é marca de serviços utilizada nesta operação.
              Titular do CNPJ identificado nos Termos de Uso e na Política de Privacidade.
            </p>
          </div>

          <div className="footer-socials">
            <a href="#" className="social-btn" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
            <a href="#" className="social-btn" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a href="#" className="social-btn" aria-label="YouTube">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.4 19.54C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
              </svg>
            </a>
          </div>
        </div>

        {/* Nav Col */}
        <div className="footer-col">
          <h4>Navegação</h4>
          <ul className="footer-links">
            <li><a href="#home" onClick={(e) => handleNavClick(e, 'home')}>Home</a></li>
            <li><a href="#por-que" onClick={(e) => handleNavClick(e, 'por-que')}>Por Que Usar</a></li>
            <li><a href="#recursos" onClick={(e) => handleNavClick(e, 'recursos')}>Recursos</a></li>
            <li><a href="#planos" onClick={(e) => handleNavClick(e, 'planos')}>Planos</a></li>
            <li><a href="#passo-a-passo" onClick={(e) => handleNavClick(e, 'passo-a-passo')}>Como Funciona</a></li>
            <li><a href="#" onClick={(e) => handleModalClick(e, 'login')}>Área do Cliente</a></li>
            <li><a href="#" onClick={(e) => handleModalClick(e, 'cadastro')}>Criar Conta</a></li>
          </ul>
        </div>

        {/* Company Col */}
        <div className="footer-col">
          <h4>Empresa</h4>
          <ul className="footer-links">
            <li><a href="#">Sobre Nós</a></li>
            <li><a href="#">Blog SST</a></li>
            <li><a href="#">Central de Ajuda</a></li>
          </ul>
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ marginBottom: '12px' }}>Conformidade</h4>
            <ul className="footer-links">
              <li><Link to="/termos-de-uso">Termos de uso</Link></li>
              <li><Link to="/politica-privacidade">Política Privacidade</Link></li>
              <li><Link to="/politica-cookies">Política de Cookies</Link></li>
            </ul>
          </div>
        </div>

        {/* Contact Col */}
        <div className="footer-col">
          <h4>Fale Conosco</h4>
          <div className="contact-item">
            <div className="contact-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.27 6.27l.94-.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            </div>
            <div className="contact-text"><strong>Telefone:</strong> {EMPRESA.telefone}</div>
          </div>

          <div className="footer-contact-form">
            <form onSubmit={handleFooterContact}>
              <div className="form-group">
                <input
                  type="text"
                  name="full_name"
                  placeholder="Seu nome"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="email"
                  name="email_address"
                  placeholder="E-mail"
                  value={formData.email_address}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  name="message"
                  placeholder="Mensagem"
                  rows={2}
                  value={formData.message}
                  onChange={handleInputChange}
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Enviar mensagem
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="footer-bottom" style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', position: 'relative', zIndex: 2 }}>
        <span style={{ color: '#475569', fontSize: '.8rem' }}>
          © {new Date().getFullYear()}{' '}
          <span style={{ color: 'var(--primary)' }}>{EMPRESA.marca}™</span>
          {' · '}{EMPRESA.marcaCasa}™ · CNPJ {EMPRESA.cnpj}. Todos os direitos reservados.
        </span>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link to="/politica-privacidade" style={{ color: '#475569', fontSize: '.78rem', textDecoration: 'none' }}>Privacidade</Link>
          <Link to="/termos-de-uso" style={{ color: '#475569', fontSize: '.78rem', textDecoration: 'none' }}>Termos</Link>
        </div>
      </div>
    </footer>
  );
};

export default Rodape;