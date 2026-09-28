-- Convite cria a ficha e o vínculo nos projetos.
-- Só vale quando o Supabase marcou invited_at (inviteUserByEmail).

create or replace function public.novo_registro_usuario_convidado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assinatura_id uuid;
  v_nome text;
  v_funcao text;
begin
  if coalesce(new.raw_user_meta_data->>'origem_cadastro', '') <> 'CONVIDADO' then
    return new;
  end if;

  if new.invited_at is null then
    return new;
  end if;

  if exists (select 1 from public.usuarios where id = new.id) then
    return new;
  end if;

  begin
    v_assinatura_id := nullif(new.raw_user_meta_data->>'assinatura_id', '')::uuid;
  exception
    when invalid_text_representation then
      return new;
  end;

  if v_assinatura_id is null then
    return new;
  end if;

  if not exists (select 1 from public.assinaturas where id = v_assinatura_id) then
    return new;
  end if;

  v_nome := coalesce(nullif(trim(new.raw_user_meta_data->>'nome_completo'), ''), 'Colaborador');
  v_funcao := case
    when upper(coalesce(new.raw_user_meta_data->>'role', '')) = 'GESTOR' then 'GESTOR'
    else 'COLABORADOR'
  end;

  insert into public.usuarios (id, assinatura_id, email, nome_completo, status, status_cadastro)
  values (new.id, v_assinatura_id, new.email, v_nome, true, 'PENDENTE');

  if jsonb_typeof(new.raw_user_meta_data->'projeto_ids') = 'array' then
    insert into public.membro_projetos (assinatura_id, usuario_id, projeto_id, funcao, status)
    select v_assinatura_id, new.id, p_id::uuid, v_funcao, true
    from jsonb_array_elements_text(new.raw_user_meta_data->'projeto_ids') as p_id
    where p_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and exists (
        select 1 from public.projetos pr
        where pr.id = p_id::uuid
          and pr.assinatura_id = v_assinatura_id
      )
    on conflict (usuario_id, projeto_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_novo_usuario_convidado on auth.users;
create trigger trg_novo_usuario_convidado
  after insert on auth.users
  for each row
  execute function public.novo_registro_usuario_convidado();
