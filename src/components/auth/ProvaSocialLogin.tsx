import { useMemo } from 'react';
import { BRAND } from '../../lib/brandAssets';
import {
  calcularUsuariosAtivosMarketing,
  formatarUsuariosMarketing,
} from '../../lib/marketingUsuariosAtivos';

const NOMES_POOL = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fábio', 'Gabriela', 'Hugo',
  'Isabela', 'João', 'Karen', 'Lucas', 'Marina', 'Nicolas', 'Olívia', 'Pedro',
  'Rafaela', 'Sofia', 'Thiago', 'Úrsula', 'Vitor', 'Wendy', 'Xavier', 'Yasmin',
  'Zeca', 'Beatriz', 'Caio', 'Daniela', 'Eduardo', 'Fernanda', 'Gustavo', 'Helena',
  'Igor', 'Júlia', 'Kaique', 'Larissa', 'Mateus', 'Natália', 'Otávio', 'Patrícia',
  'Renata', 'Samuel', 'Tatiane', 'Vinícius', 'Amanda', 'Roberto', 'Camila', 'André',
];

const CORES_INICIAL = ['bg-blue', 'bg-dark', 'bg-teal', 'bg-violet', 'bg-amber'] as const;

type AvatarItem =
  | { tipo: 'foto'; src: string; key: string }
  | { tipo: 'inicial'; letras: string; cor: string; key: string };

function embaralhar<T>(lista: T[]): T[] {
  const arr = [...lista];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
  return nome.slice(0, 2).toUpperCase();
}

/** Monta 2 fotos + 2 iniciais aleatórias a cada montagem da página. */
function sortearAvatares(): AvatarItem[] {
  const nomes = embaralhar(NOMES_POOL);
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fotos: AvatarItem[] = [
    {
      tipo: 'foto',
      src: `https://i.pravatar.cc/100?u=${encodeURIComponent(`${seed}-1`)}`,
      key: `${seed}-f1`,
    },
    {
      tipo: 'foto',
      src: `https://i.pravatar.cc/100?u=${encodeURIComponent(`${seed}-2`)}`,
      key: `${seed}-f2`,
    },
  ];
  const iniciais: AvatarItem[] = [
    {
      tipo: 'inicial',
      letras: iniciaisDe(nomes[0]),
      cor: CORES_INICIAL[Math.floor(Math.random() * CORES_INICIAL.length)],
      key: `${seed}-i1`,
    },
    {
      tipo: 'inicial',
      letras: iniciaisDe(nomes[1]),
      cor: CORES_INICIAL[Math.floor(Math.random() * CORES_INICIAL.length)],
      key: `${seed}-i2`,
    },
  ];
  // Mistura a ordem dos 4 círculos
  return embaralhar([...fotos, ...iniciais]);
}

/** Prova social do painel comercial (login / auth shell). */
export default function ProvaSocialLogin() {
  const avatares = useMemo(() => sortearAvatares(), []);
  const rotuloUsuarios = useMemo(() => {
    const total = calcularUsuariosAtivosMarketing();
    return formatarUsuariosMarketing(total);
  }, []);

  return (
    <div className="proof-container">
      <div className="stack-avatars" aria-hidden="true">
        {avatares.map((item) =>
          item.tipo === 'foto' ? (
            <img key={item.key} src={item.src} alt="" loading="lazy" />
          ) : (
            <div key={item.key} className={`initial-av ${item.cor}`}>
              {item.letras}
            </div>
          ),
        )}
        <div className="dots-more">...</div>
      </div>
      <p className="proof-label">
        Mais de <strong>{rotuloUsuarios} usuários</strong> confiam na {BRAND.name}
      </p>
    </div>
  );
}
