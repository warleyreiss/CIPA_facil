# Dados institucionais (espelho de src/config/empresa.ts)

Faça upload deste arquivo no bucket público `comercial` como **`empresa.json`**
(as Edge Functions leem esse JSON em tempo de execução).

```bash
# Via Dashboard: Storage → comercial → Upload → empresa.json (público)

# Ou via CLI (com projeto linkado):
supabase storage cp supabase/comercial/empresa.json ss:///comercial/empresa.json --experimental
```

O arquivo `empresa.ts` no bucket **não é lido** pelas functions (TypeScript remoto
não é executável). Use sempre **`empresa.json`**.

Após alterar templates Auth em `supabase/templates/` e `config.toml`:

```bash
supabase config push
```

Após alterar Edge Functions de e-mail:

```bash
supabase functions deploy enviar-cotacao-epi
supabase functions deploy notificar-vencimentos-epi
```
