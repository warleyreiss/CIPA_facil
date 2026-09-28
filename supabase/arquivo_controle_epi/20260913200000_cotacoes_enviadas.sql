-- Log de cotações / pedidos de compra enviados por e-mail (cases de sucesso)

CREATE TABLE IF NOT EXISTS public.cotacoes_enviadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  parceiro_id uuid REFERENCES public.parceiros(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  email_destino text,
  itens_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cotacoes_enviadas IS
  'Cada linha = 1 e-mail de cotação (pedido de compras) enviado a um fornecedor.';

CREATE INDEX IF NOT EXISTS idx_cotacoes_enviadas_parceiro ON public.cotacoes_enviadas (parceiro_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_enviadas_fornecedor ON public.cotacoes_enviadas (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_enviadas_projeto ON public.cotacoes_enviadas (projeto_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_enviadas_created ON public.cotacoes_enviadas (created_at DESC);

ALTER TABLE public.cotacoes_enviadas ENABLE ROW LEVEL SECURITY;

-- Membros do projeto podem inserir (após disparo do e-mail)
DROP POLICY IF EXISTS "cotacoes_enviadas_insert_membro" ON public.cotacoes_enviadas;
CREATE POLICY "cotacoes_enviadas_insert_membro"
  ON public.cotacoes_enviadas FOR INSERT TO authenticated
  WITH CHECK (
    projeto_id IS NOT NULL
    AND public.checar_acesso_projeto(projeto_id)
  );

-- Membros leem do próprio projeto
DROP POLICY IF EXISTS "cotacoes_enviadas_select_membro" ON public.cotacoes_enviadas;
CREATE POLICY "cotacoes_enviadas_select_membro"
  ON public.cotacoes_enviadas FOR SELECT TO authenticated
  USING (
    projeto_id IS NOT NULL
    AND public.checar_acesso_projeto(projeto_id)
  );

-- Admin / suporte: leitura ampla (insights)
DROP POLICY IF EXISTS "admin_suporte_select_cotacoes_enviadas" ON public.cotacoes_enviadas;
CREATE POLICY "admin_suporte_select_cotacoes_enviadas"
  ON public.cotacoes_enviadas FOR SELECT TO authenticated
  USING (public.is_admin_suporte());

GRANT SELECT, INSERT ON TABLE public.cotacoes_enviadas TO authenticated;
GRANT ALL ON TABLE public.cotacoes_enviadas TO service_role;
