-- PostgREST exige FK para embed epis:epi_id na consulta do histórico de fornecimento.

ALTER TABLE public.historico_controle_epi
  DROP CONSTRAINT IF EXISTS historico_controle_epi_epi_id_fkey;

ALTER TABLE public.historico_controle_epi
  ADD CONSTRAINT historico_controle_epi_epi_id_fkey
  FOREIGN KEY (epi_id) REFERENCES public.epis(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT historico_controle_epi_epi_id_fkey ON public.historico_controle_epi IS
  'Permite join epis:epi_id no histórico de fornecimento (PostgREST).';
