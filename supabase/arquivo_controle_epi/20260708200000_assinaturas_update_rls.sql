-- Permite ao titular da assinatura atualizar configurações (ex.: assinatura_tipo)
CREATE POLICY "Proprietários podem atualizar sua assinatura"
  ON public.assinaturas
  FOR UPDATE
  TO authenticated
  USING (proprietario_id = auth.uid())
  WITH CHECK (proprietario_id = auth.uid());
