-- Orientação de suporte: validação digital no fornecimento de EPI

DELETE FROM public.suporte_orientacoes
WHERE titulo = 'Validação digital no fornecimento de EPI';

INSERT INTO public.suporte_orientacoes (titulo, descricao, link_materiais, link_video)
VALUES (
  'Validação digital no fornecimento de EPI',
  $$Recurso para planos elegíveis (Gestor). Comprova o recebimento do EPI por cartão RFID ou leitor biométrico, sem assinatura em papel.

Onde ativar:
Configurar Projeto → Dados do Projeto → interruptor "Validação digital". Ao ligar, um guia de 60 segundos explica RFID e biometria antes de confirmar. Depois, clique em Salvar Configurações.

Fluxo no fornecimento:
1. Preencha colaborador, EPI, CA, quantidade e motivo.
2. Clique em "Assinar digitalmente".
3. Na segunda etapa, aproxime o cartão ou capture a digital.
4. Quando o sistema identificar a leitura, Concluir é liberado.
5. O comprovante registra o método (RFID ou Biometria).

Cartão RFID — leitor USB em modo teclado (HID), sem driver: MIFARE, 125 kHz etc. Cadastre o UID de cada colaborador previamente.

Biometria — instale o agente ControleEPI (Windows) se o leitor não operar em modo teclado. Marcas sugeridas: ZKTeco, Intelbras, Control iD, Nitgen.

Para desativar, desligue o interruptor e salve o projeto.$$,
  '/downloads/ControleEPI-Agente-Biometria.exe',
  NULL
);
