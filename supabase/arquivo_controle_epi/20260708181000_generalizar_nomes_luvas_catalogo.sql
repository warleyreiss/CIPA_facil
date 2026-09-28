-- Generaliza nomes de luvas que continham marca/modelo comercial no catálogo mestre.
-- IDs permanecem os mesmos; vínculos em epis, controle_epi e funções não são afetados.

UPDATE public.epi_catalogo
SET descricao = U&'LUVA TRICOTADA MULTIT\00C1TIL'
WHERE id = '7d105003-c0f0-47b8-80e4-260c488acc7e';

UPDATE public.epi_catalogo
SET descricao = 'LUVA EM NEOPRENE'
WHERE id = '8adabe81-e384-452d-92f8-2370d28c283b';
