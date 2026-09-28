# Inventário Supabase remoto — ControleEPI

**Projeto:** ndcpitpvaphhwoidcdhs  
**URL:** https://ndcpitpvaphhwoidcdhs.supabase.co  
**Status link CLI:** já vinculado (`supabase projects list` → `linked: true`)  
**Atualizado em:** 2026-07-07

### Schema SQL completo (migrations)

Arquivo gerado com `supabase db pull baseline_remoto --linked` (Docker ativo):

- `supabase/migrations/20260707002555_baseline_remoto.sql` (~2290 linhas)
- Contém tabelas, funções RPC, RLS, triggers e demais objetos `public`

O passo final de *diff* pode avisar erro de senha (`SUPABASE_DB_PASSWORD`); isso não invalida o arquivo de migration já gerado.

---

## O que a CLI consegue fazer

| Recurso | Comando | Funciona sem Docker? |
|---------|---------|----------------------|
| Listar projetos / link | `supabase projects list`, `supabase link` | Sim |
| Consultas SQL pontuais | `supabase db query --linked "..."` | Sim |
| Baixar Edge Functions | `supabase functions download --use-api` | Sim |
| Listar functions remotas | `supabase functions list` | Sim |
| Deploy functions | `supabase functions deploy` | Sim |
| Push config auth | `supabase config push` | Sim |
| **Schema completo (migrations)** | `supabase db pull --linked` | **Não** — exige Docker Desktop |
| **Dump SQL completo** | `supabase db dump --linked` | **Não** — exige Docker Desktop |
| Storage (buckets/arquivos) | CLI limitada | Parcial — Dashboard ou API |
| Secrets das functions | `supabase secrets list` | Sim (nomes, não valores) |
| Auth templates / SMTP | Dashboard ou Management API | Parcial |

**Conclusão:** para espelhar **100% do banco** como migration (`supabase/migrations/`), é preciso **Docker Desktop rodando** e então:

```bash
cd Controle_EPI_Web
supabase db pull baseline_remoto --linked
```

Sem Docker, usamos `db query --linked` + inventário (este arquivo) + functions download.

---

## Tabelas `public` (22)

| Tabela |
|--------|
| assinaturas |
| cargo_funcoes |
| catalogo_tamanhos |
| colaboradores |
| comunicados_dismiss |
| comunicados_sistema |
| controle_epi |
| epi_catalogo |
| epis |
| fornecedores |
| historico_alteracao_em_cargo_funcoes |
| historico_cargos |
| historico_controle_epi |
| log_assinaturas_auditoria |
| log_webhooks |
| membro_projetos |
| plano_regras |
| projetos |
| registro_entradas |
| setores |
| suporte_orientacoes |
| usuarios |

---

## Funções RPC `public` (21)

- checar_acesso_projeto
- checar_gestor_projeto
- check_membro_is_gestor
- check_membro_mesma_assinatura
- check_user_project_access
- criar_projeto_avulso
- fn_ajusta_colaborador_epis
- fn_debitar_estoque_epi
- fn_estornar_estoque_epi
- fn_gerenciar_mudanca_no_cargo_funcao
- fn_pode_desativar_epi
- fn_validar_e_inativar_epi
- fn_validar_membro_projeto_podem_ver_os_demais
- get_user_assinatura_id
- handle_new_user
- is_comunicado_admin
- log_mudanca_status_assinatura
- novo_registro_usuario_colaborador_depois_da_edge
- novo_registro_usuario_gestor
- processar_entrada_estoque

---

## Edge Functions remotas (8) — pasta `supabase/functions/`

| Slug local | Nome no painel | verify_jwt (remoto) |
|------------|----------------|---------------------|
| create-collaborator | create-collaborator | false |
| stripe-webhook | stripe-webhook | false |
| create-checkout | create-checkout | false |
| get-plans | get-plans | false |
| enviar-cotacao-epi | enviar-cotacao-epi | false |
| quick-api | novo_registro_usuario_colaborador_no_auth | true |
| create-portal-session-stripe | create-portal-session-stripe | true |
| downgrade-para-gratuito | downgrade-para-gratuito | true |

**Novas baixadas nesta sync (não estavam no repo):** `quick-api`, `create-portal-session-stripe`, `downgrade-para-gratuito`.

---

## RLS — políticas documentadas (amostra)

Políticas em: assinaturas, comunicados_*, historico_controle_epi, membro_projetos, plano_regras, projetos, setores, suporte_orientacoes, usuarios.

SQL soltos na raiz `supabase/` (legado, fora de migrations):

- `comunicados_rls.sql`
- `historico_controle_epi_rls.sql`
- `patch_suporte_historico_fornecimento.sql`
- `seed_suporte_orientacoes.sql`

---

## Comandos úteis para manter sincronizado

```bash
# Na pasta Controle_EPI_Web

# 1) Baixar todas as Edge Functions do remoto
supabase functions download --use-api

# 2) Consultar tabelas
supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1"

# 3) Schema completo (precisa Docker ligado)
supabase db pull nome_da_migration --linked

# 4) Deploy de uma function após editar local
supabase functions deploy nome-da-function
```

---

## O que NÃO vem automaticamente para o PC

- Dados das tabelas (só estrutura com `db pull`/`dump`)
- Arquivos do Storage (logos, etc.)
- Valores de secrets (STRIPE_KEY, RESEND, etc.)
- Configurações só do Dashboard (redirect URLs já aplicadas, SMTP, etc.)
- Histórico de migrations se nunca existiu pasta `supabase/migrations/` no projeto
