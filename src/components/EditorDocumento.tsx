import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

type Props = {
  titulo: string;
  textoInicial: string;
  aberto: boolean;
  onFechar: () => void;
};

function imprimir(titulo: string, texto: string) {
  const janela = window.open('', '_blank', 'noopener,noreferrer');
  if (!janela) return;
  janela.document.title = titulo;
  const corpo = janela.document.body;
  corpo.style.fontFamily = 'Georgia, serif';
  corpo.style.whiteSpace = 'pre-wrap';
  corpo.style.lineHeight = '1.5';
  corpo.style.margin = '2rem';
  corpo.textContent = texto;
  janela.focus();
  janela.print();
}

export default function EditorDocumento({ titulo, textoInicial, aberto, onFechar }: Props) {
  const [texto, setTexto] = useState(textoInicial);

  useEffect(() => {
    if (aberto) setTexto(textoInicial);
  }, [aberto, textoInicial]);

  return (
    <Dialog
      header={titulo}
      visible={aberto}
      style={{ width: 'min(760px, 96vw)' }}
      onHide={onFechar}
      footer={
        <Button label="Imprimir" icon="pi pi-print" onClick={() => imprimir(titulo, texto)} />
      }
    >
      <p>Edite o texto e imprima a versão que ficar na tela.</p>
      <textarea
        className="editor-ata"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />
    </Dialog>
  );
}
