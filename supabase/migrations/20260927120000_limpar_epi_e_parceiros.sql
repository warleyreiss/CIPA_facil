-- Tira o que veio do Controle EPI e não serve para a CIPA.
-- Não altera o banco do Controle EPI. Rode só neste projeto.

drop function if exists public.aplicar_indicacao_parceiro(text);
drop function if exists public.contar_epis_ativos_projeto(uuid);
drop table if exists public.parceiros;

alter table public.projetos
  drop column if exists telefone_whatsapp_notificacao,
  drop column if exists inscricao_estadual,
  drop column if exists inscricao_municipal,
  drop column if exists periodicidade_troca,
  drop column if exists controle_estoque,
  drop column if exists dias_iminencia_troca,
  drop column if exists obrigar_guia_tamanhos_colaborador;

drop function if exists public.fn_provisionar_gestor_oauth(text, text, text, uuid, text, text);

create or replace function public.fn_provisionar_gestor_oauth(
  p_nome_completo text default null,
  p_assinatura_tipo text default 'AUTONOMO',
  p_cnpj text default null,
  p_assinatura_id uuid default null,
  p_contato text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_nome text;
  v_assinatura_id uuid;
  v_projeto_id uuid;
  v_preco text;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if exists (select 1 from public.usuarios where id = v_user_id) then
    return v_user_id;
  end if;

  select email into v_email from auth.users where id = v_user_id;
  v_nome := coalesce(nullif(trim(p_nome_completo), ''), 'Meu projeto');
  v_preco := public.fn_price_id_plano_iniciante();

  if p_assinatura_id is not null
     and public.fn_pode_claim_checkout_assinatura(p_assinatura_id, v_email, v_user_id) then
    v_assinatura_id := p_assinatura_id;
  end if;

  if v_assinatura_id is null then
    insert into public.assinaturas (
      plano_status, assinatura_tipo, plano_tipo, plano_regra_id, checkout_email
    ) values (
      'active',
      coalesce(nullif(trim(p_assinatura_tipo), ''), 'AUTONOMO'),
      'INICIANTE',
      v_preco,
      lower(trim(coalesce(v_email, '')))
    )
    returning id into v_assinatura_id;
  end if;

  insert into public.usuarios (id, assinatura_id, email, nome_completo, telefone, status)
  values (v_user_id, v_assinatura_id, v_email, v_nome, nullif(trim(p_contato), ''), true);

  update public.assinaturas
  set proprietario_id = v_user_id,
      plano_regra_id = coalesce(plano_regra_id, v_preco)
  where id = v_assinatura_id
    and proprietario_id is null;

  insert into public.projetos (assinatura_id, nome, cnpj, status)
  values (v_assinatura_id, v_nome, nullif(trim(p_cnpj), ''), true)
  returning id into v_projeto_id;

  insert into public.membro_projetos (assinatura_id, usuario_id, projeto_id, funcao, status)
  values (v_assinatura_id, v_user_id, v_projeto_id, 'GESTOR', true);

  return v_user_id;
end;
$$;

revoke all on function public.fn_provisionar_gestor_oauth(text, text, text, uuid, text) from public, anon;
grant execute on function public.fn_provisionar_gestor_oauth(text, text, text, uuid, text) to authenticated, service_role;
