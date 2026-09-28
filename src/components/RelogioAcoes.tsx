import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ehAcaoRotina, listarAcoes, resumirPrazos } from '../lib/acaoService';
import { useProjeto } from '../contexts/ProjetoContext';

function textoDia(data: Date): string {
  const dia = data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} · ${hora}`;
}

export default function RelogioAcoes() {
  const navigate = useNavigate();
  const { projetoId } = useProjeto();
  const [agora, setAgora] = useState(() => new Date());
  const [prazos, setPrazos] = useState('Nenhuma ação com prazo aberto');

  useEffect(() => {
    const relogio = window.setInterval(() => setAgora(new Date()), 30000);
    return () => window.clearInterval(relogio);
  }, []);

  useEffect(() => {
    if (!projetoId) {
      setPrazos('Nenhuma ação com prazo aberto');
      return;
    }
    let ativo = true;
    const carregar = () => {
      listarAcoes(projetoId)
        .then((acoes) => {
          if (ativo) setPrazos(resumirPrazos(acoes.filter(ehAcaoRotina)));
        })
        .catch(() => {
          if (ativo) setPrazos('Prazos indisponíveis');
        });
    };
    carregar();
    window.addEventListener('acoes-atualizadas', carregar);
    return () => {
      ativo = false;
      window.removeEventListener('acoes-atualizadas', carregar);
    };
  }, [projetoId]);

  return (
    <button
      type="button"
      className="header_relogio"
      onClick={() => navigate('/acoes')}
      title="Abrir o controle de ações"
    >
      <span className="header_relogio_dia">{textoDia(agora)}</span>
      <span className="header_relogio_prazo">{prazos}</span>
    </button>
  );
}
