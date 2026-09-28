import { useEffect, useRef } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Placeholder } from '@tiptap/extensions';
import {
  Bold,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  TextQuote,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { ataParaHtml } from '../lib/ataHtml';
import '../assets/css/especificos/editor-ata.css';

const FONTES = [
  { rotulo: 'Fonte padrão', valor: '' },
  { rotulo: 'Arial', valor: 'Arial, sans-serif' },
  { rotulo: 'Georgia', valor: 'Georgia, serif' },
  { rotulo: 'Times New Roman', valor: '"Times New Roman", serif' },
  { rotulo: 'Verdana', valor: 'Verdana, sans-serif' },
  { rotulo: 'Courier New', valor: '"Courier New", monospace' },
];

const TAMANHOS = ['', '12px', '14px', '16px', '18px', '22px', '28px'];

type Props = {
  id?: string;
  valor: string;
  onChange: (html: string) => void;
  editavel?: boolean;
  roteiro?: string[];
  placeholder?: string;
};

function htmlDoRoteiro(itens: string[]) {
  const escapar = (texto: string) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return itens.map((item, indice) => `<h3>${indice + 1}. ${escapar(item)}</h3><p></p>`).join('');
}

function Botao({
  icone: Icone,
  rotulo,
  ativo,
  onClick,
  desabilitado,
}: {
  icone: LucideIcon;
  rotulo: string;
  ativo?: boolean;
  onClick: () => void;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      className={`editor-ata__botao${ativo ? ' is-ativo' : ''}`}
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={ativo}
      disabled={desabilitado}
      onMouseDown={(evento) => evento.preventDefault()}
      onClick={onClick}
    >
      <Icone size={16} strokeWidth={2.2} aria-hidden />
    </button>
  );
}

function Ferramentas({ editor, roteiro }: { editor: Editor; roteiro?: string[] }) {
  const estado = useEditorState({
    editor,
    selector: ({ editor: atual }) => ({
      negrito: atual.isActive('bold'),
      italico: atual.isActive('italic'),
      sublinhado: atual.isActive('underline'),
      riscado: atual.isActive('strike'),
      marcadores: atual.isActive('bulletList'),
      numerada: atual.isActive('orderedList'),
      citacao: atual.isActive('blockquote'),
      bloco: atual.isActive('heading', { level: 2 }) ? 'h2' : atual.isActive('heading', { level: 3 }) ? 'h3' : 'p',
      alinhamento: (['center', 'right', 'justify'] as const).find((lado) => atual.isActive({ textAlign: lado })) ?? 'left',
      fonte: (atual.getAttributes('textStyle').fontFamily as string | undefined) ?? '',
      tamanho: (atual.getAttributes('textStyle').fontSize as string | undefined) ?? '',
      desfazer: atual.can().undo(),
      refazer: atual.can().redo(),
    }),
  });
  const cadeia = () => editor.chain().focus();

  return (
    <div className="editor-ata__ferramentas" role="toolbar" aria-label="Formatação da ata">
      <div className="editor-ata__grupo">
        <select
          aria-label="Estilo do parágrafo"
          value={estado.bloco}
          onChange={(evento) => {
            const valor = evento.target.value;
            if (valor === 'p') cadeia().setParagraph().run();
            else cadeia().setHeading({ level: valor === 'h2' ? 2 : 3 }).run();
          }}
        >
          <option value="p">Texto normal</option>
          <option value="h2">Título</option>
          <option value="h3">Subtítulo</option>
        </select>
        <select
          aria-label="Fonte"
          value={FONTES.some((fonte) => fonte.valor === estado.fonte) ? estado.fonte : ''}
          onChange={(evento) => {
            const valor = evento.target.value;
            if (valor) cadeia().setFontFamily(valor).run();
            else cadeia().unsetFontFamily().run();
          }}
        >
          {FONTES.map((fonte) => (
            <option key={fonte.rotulo} value={fonte.valor}>
              {fonte.rotulo}
            </option>
          ))}
        </select>
        <select
          aria-label="Tamanho da letra"
          className="editor-ata__tamanho"
          value={TAMANHOS.includes(estado.tamanho) ? estado.tamanho : ''}
          onChange={(evento) => {
            const valor = evento.target.value;
            if (valor) cadeia().setFontSize(valor).run();
            else cadeia().unsetFontSize().run();
          }}
        >
          {TAMANHOS.map((tamanho) => (
            <option key={tamanho || 'padrao'} value={tamanho}>
              {tamanho ? tamanho.replace('px', '') : 'Tam.'}
            </option>
          ))}
        </select>
      </div>

      <div className="editor-ata__grupo">
        <Botao icone={Bold} rotulo="Negrito (Ctrl+B)" ativo={estado.negrito} onClick={() => cadeia().toggleBold().run()} />
        <Botao icone={Italic} rotulo="Itálico (Ctrl+I)" ativo={estado.italico} onClick={() => cadeia().toggleItalic().run()} />
        <Botao icone={Underline} rotulo="Sublinhado (Ctrl+U)" ativo={estado.sublinhado} onClick={() => cadeia().toggleUnderline().run()} />
        <Botao icone={Strikethrough} rotulo="Riscado" ativo={estado.riscado} onClick={() => cadeia().toggleStrike().run()} />
      </div>

      <div className="editor-ata__grupo">
        <Botao icone={List} rotulo="Lista com marcadores" ativo={estado.marcadores} onClick={() => cadeia().toggleBulletList().run()} />
        <Botao icone={ListOrdered} rotulo="Lista numerada" ativo={estado.numerada} onClick={() => cadeia().toggleOrderedList().run()} />
        <Botao icone={TextQuote} rotulo="Destaque" ativo={estado.citacao} onClick={() => cadeia().toggleBlockquote().run()} />
      </div>

      <div className="editor-ata__grupo">
        <Botao icone={TextAlignStart} rotulo="Alinhar à esquerda" ativo={estado.alinhamento === 'left'} onClick={() => cadeia().setTextAlign('left').run()} />
        <Botao icone={TextAlignCenter} rotulo="Centralizar" ativo={estado.alinhamento === 'center'} onClick={() => cadeia().setTextAlign('center').run()} />
        <Botao icone={TextAlignEnd} rotulo="Alinhar à direita" ativo={estado.alinhamento === 'right'} onClick={() => cadeia().setTextAlign('right').run()} />
        <Botao icone={TextAlignJustify} rotulo="Justificar" ativo={estado.alinhamento === 'justify'} onClick={() => cadeia().setTextAlign('justify').run()} />
      </div>

      <div className="editor-ata__grupo">
        <Botao icone={RemoveFormatting} rotulo="Limpar formatação" onClick={() => cadeia().unsetAllMarks().clearNodes().run()} />
        <Botao icone={Undo2} rotulo="Desfazer (Ctrl+Z)" desabilitado={!estado.desfazer} onClick={() => cadeia().undo().run()} />
        <Botao icone={Redo2} rotulo="Refazer (Ctrl+Y)" desabilitado={!estado.refazer} onClick={() => cadeia().redo().run()} />
      </div>

      {roteiro?.length ? (
        <button
          type="button"
          className="editor-ata__roteiro"
          title="Insere cada item da súmula como um tópico para você escrever o que foi tratado"
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => cadeia().insertContent(htmlDoRoteiro(roteiro)).run()}
        >
          <ListChecks size={16} aria-hidden /> Usar a súmula como roteiro
        </button>
      ) : null}
    </div>
  );
}

export default function EditorAta({ id, valor, onChange, editavel = true, roteiro, placeholder }: Props) {
  const emitido = useRef(valor);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, code: false, codeBlock: false, heading: { levels: [2, 3] } }),
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Escreva o que foi tratado e decidido na reunião…' }),
    ],
    content: ataParaHtml(valor),
    editable: editavel,
    shouldRerenderOnTransaction: false,
    editorProps: { attributes: { class: 'editor-ata__texto', ...(id ? { id } : {}) } },
    onUpdate: ({ editor: atual }) => {
      const html = atual.isEmpty ? '' : atual.getHTML();
      emitido.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editavel);
  }, [editor, editavel]);

  useEffect(() => {
    if (!editor || valor === emitido.current) return;
    emitido.current = valor;
    editor.commands.setContent(ataParaHtml(valor), { emitUpdate: false });
  }, [editor, valor]);

  return (
    <div className={`editor-ata${editavel ? '' : ' is-leitura'}`}>
      {editor && editavel ? <Ferramentas editor={editor} roteiro={roteiro} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}
