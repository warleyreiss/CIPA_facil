-- CIPA Fácil — base da conta, do projeto e da assinatura.
-- Rode só no projeto novo do Supabase. Não envie este arquivo para o banco do Controle EPI.
-- Nomes em português. Campos do Stripe ficam em inglês porque vêm de fora.

-- ── Planos ──────────────────────────────────────────────────────────────────
create table public.plano_regras (
  stripe_price_id text primary key,
  nome_plano text not null,
  quantidade_projetos integer not null default 1,
  quantidade_colaboradores integer not null default 0,
  quantidade_epis integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.plano_regras is 'Limites de cada plano. stripe_price_id é o preço no Stripe.';

-- Troque estes códigos pelos prices reais quando criar a conta no Stripe.
insert into public.plano_regras (stripe_price_id, nome_plano, quantidade_projetos, quantidade_colaboradores, quantidade_epis)
values
  ('price_cipa_iniciante', 'INICIANTE', 1, 0, 0),
  ('price_cipa_pro', 'PRO', 3, 0, 0),
  ('price_cipa_gestor', 'GESTOR', 5, 0, 0);

-- ── Assinatura (a conta paga) ───────────────────────────────────────────────
create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  proprietario_id uuid,
  assinatura_tipo text not null default 'AUTONOMO',
  plano_tipo text not null default 'INICIANTE',
  plano_status text not null default 'active',
  plano_regra_id text references public.plano_regras (stripe_price_id),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  dias_tolerancia integer not null default 15,
  cancel_at_period_end boolean not null default false,
  encerrar_conta_agendado boolean not null default false,
  data_inicio timestamptz,
  proxima_fatura timestamptz,
  plano_fim_periodo timestamptz,
  data_falha_pagamento timestamptz,
  usar_logo_padrao_projetos boolean not null default false,
  logo_padrao_url text,
  cortesia boolean not null default false,
  cortesia_em timestamptz,
  cortesia_motivo text,
  checkout_email text,
  created_at timestamptz not null default now()
);

-- ── Pessoa que entra no sistema ─────────────────────────────────────────────
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  assinatura_id uuid references public.assinaturas (id),
  email text,
  nome_completo text,
  telefone text,
  foto_url text,
  status boolean not null default true,
  status_cadastro text not null default 'ATIVO',
  onboarding_concluido boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.assinaturas
  add constraint assinaturas_proprietario_id_fkey
  foreign key (proprietario_id) references public.usuarios (id);

-- ── Ambiente de trabalho (um cliente pode ter mais de um) ───────────────────
create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  assinatura_id uuid not null references public.assinaturas (id),
  nome text not null,
  cnpj text,
  logo_url text,
  telefone_whatsapp_notificacao text,
  cep text,
  inscricao_estadual text,
  inscricao_municipal text,
  periodicidade_troca boolean not null default false,
  controle_estoque boolean not null default false,
  dias_iminencia_troca integer not null default 3,
  obrigar_guia_tamanhos_colaborador boolean not null default false,
  status boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Quem participa de cada projeto ──────────────────────────────────────────
create table public.membro_projetos (
  id uuid primary key default gen_random_uuid(),
  assinatura_id uuid not null references public.assinaturas (id),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  funcao text not null default 'COLABORADOR',
  status boolean not null default true,
  created_at timestamptz not null default now(),
  unique (usuario_id, projeto_id)
);

-- ── Histórico simples das alterações do projeto ─────────────────────────────
create table public.historico_alteracao_projetos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  alterado_por uuid references public.usuarios (id),
  campos_alterados text[] not null default '{}',
  alteracoes jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ── Parceiro que indica um cadastro ─────────────────────────────────────────
create table public.parceiros (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  razao_social text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Avisos dentro do sistema ────────────────────────────────────────────────
create table public.comunicados_sistema (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  tipo text not null default 'info',
  ativo boolean not null default true,
  prioridade integer not null default 0,
  inicia_em timestamptz,
  expira_em timestamptz,
  planos_alvo text[],
  assinatura_tipos_alvo text[],
  created_at timestamptz not null default now()
);

create table public.comunicados_dismiss (
  id uuid primary key default gen_random_uuid(),
  comunicado_id uuid not null references public.comunicados_sistema (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comunicado_id, usuario_id)
);

-- ── Textos de ajuda ─────────────────────────────────────────────────────────
create table public.suporte_orientacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null unique,
  descricao text not null default '',
  link_materiais text,
  link_video text,
  created_at timestamptz not null default now()
);

-- ── Registro dos eventos do Stripe ──────────────────────────────────────────
create table public.log_webhooks (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text,
  payload jsonb,
  status text not null default 'processing',
  erro_mensagem text,
  created_at timestamptz not null default now()
);

-- ── Funções ─────────────────────────────────────────────────────────────────
create or replace function public.fn_price_id_plano_iniciante()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select stripe_price_id
  from public.plano_regras
  where nome_plano = 'INICIANTE'
  limit 1;
$$;

create or replace function public.usuario_pertence_assinatura(p_assinatura_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios
    where id = auth.uid()
      and assinatura_id = p_assinatura_id
      and coalesce(status, true)
  );
$$;

-- Só o e-mail do checkout pode pegar uma assinatura que ainda não tem dono.
create or replace function public.fn_pode_claim_checkout_assinatura(
  p_assinatura_id uuid,
  p_email text,
  p_user_id uuid default null
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ass public.assinaturas%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if p_assinatura_id is null or position('@' in v_email) = 0 then
    return false;
  end if;

  select * into v_ass from public.assinaturas where id = p_assinatura_id;
  if not found then
    return false;
  end if;

  if v_ass.proprietario_id is not null then
    return p_user_id is not null and v_ass.proprietario_id = p_user_id;
  end if;

  if v_ass.created_at < (now() - interval '72 hours') then
    return false;
  end if;

  if lower(trim(coalesce(v_ass.checkout_email, ''))) <> v_email then
    return false;
  end if;

  return v_ass.plano_status in ('incomplete', 'active', 'trialing');
end;
$$;

create or replace function public.fn_vincular_assinatura_checkout_pendente(p_assinatura_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  if not public.fn_pode_claim_checkout_assinatura(p_assinatura_id, v_email, v_user_id) then
    return false;
  end if;

  update public.assinaturas
  set proprietario_id = v_user_id
  where id = p_assinatura_id
    and (proprietario_id is null or proprietario_id = v_user_id);

  update public.usuarios
  set assinatura_id = p_assinatura_id
  where id = v_user_id;

  return true;
end;
$$;

-- Cria assinatura, projeto e vínculo quando a pessoa se cadastra como dona.
create or replace function public.novo_registro_usuario_gestor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assinatura_id uuid;
  v_projeto_id uuid;
  v_nome text;
  v_preco text;
  v_assinatura_paga uuid;
begin
  if coalesce(new.raw_user_meta_data->>'origem_cadastro', '') <> 'DONO' then
    return new;
  end if;

  if exists (select 1 from public.usuarios where id = new.id) then
    return new;
  end if;

  v_nome := coalesce(nullif(trim(new.raw_user_meta_data->>'nome_completo'), ''), 'Meu projeto');
  v_preco := public.fn_price_id_plano_iniciante();
  v_assinatura_paga := nullif(new.raw_user_meta_data->>'assinatura_id', '')::uuid;

  if v_assinatura_paga is not null
     and public.fn_pode_claim_checkout_assinatura(v_assinatura_paga, new.email, new.id) then
    v_assinatura_id := v_assinatura_paga;
  end if;

  if v_assinatura_id is null then
    insert into public.assinaturas (
      plano_status, assinatura_tipo, plano_tipo, plano_regra_id, checkout_email
    ) values (
      'active',
      coalesce(nullif(trim(new.raw_user_meta_data->>'assinatura_tipo'), ''), 'AUTONOMO'),
      'INICIANTE',
      v_preco,
      lower(trim(new.email))
    )
    returning id into v_assinatura_id;
  end if;

  insert into public.usuarios (id, assinatura_id, email, nome_completo, status, status_cadastro)
  values (new.id, v_assinatura_id, new.email, v_nome, true, 'ATIVO');

  update public.assinaturas
  set proprietario_id = new.id,
      plano_regra_id = coalesce(plano_regra_id, v_preco)
  where id = v_assinatura_id
    and proprietario_id is null;

  insert into public.projetos (assinatura_id, nome, cnpj, status)
  values (
    v_assinatura_id,
    v_nome,
    nullif(trim(new.raw_user_meta_data->>'cnpj'), ''),
    true
  )
  returning id into v_projeto_id;

  insert into public.membro_projetos (assinatura_id, usuario_id, projeto_id, funcao, status)
  values (v_assinatura_id, new.id, v_projeto_id, 'GESTOR', true);

  return new;
end;
$$;

drop trigger if exists trg_novo_usuario on auth.users;
create trigger trg_novo_usuario
  after insert on auth.users
  for each row
  execute function public.novo_registro_usuario_gestor();

create or replace function public.fn_provisionar_gestor_oauth(
  p_nome_completo text default null,
  p_assinatura_tipo text default 'AUTONOMO',
  p_cnpj text default null,
  p_assinatura_id uuid default null,
  p_contato text default null,
  p_parceiro_codigo text default null
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

create or replace function public.criar_projeto_avulso(p_nome text, p_assinatura_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_projeto_id uuid;
  v_limite integer;
  v_quantidade integer;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.usuario_pertence_assinatura(p_assinatura_id) then
    raise exception 'Acesso negado: seu usuário não está nesta assinatura.';
  end if;

  select coalesce(pr.quantidade_projetos, 1)
  into v_limite
  from public.assinaturas a
  left join public.plano_regras pr
    on pr.stripe_price_id = coalesce(nullif(a.plano_regra_id, ''), a.stripe_price_id)
    or pr.nome_plano = a.plano_tipo
  where a.id = p_assinatura_id
  limit 1;

  select count(*)::integer into v_quantidade
  from public.projetos
  where assinatura_id = p_assinatura_id
    and coalesce(status, true);

  if coalesce(v_limite, 0) > 0 and v_quantidade >= v_limite then
    raise exception 'LIMITE_PLANO: limite de projetos atingido (%).', v_limite;
  end if;

  insert into public.projetos (nome, assinatura_id, status)
  values (p_nome, p_assinatura_id, true)
  returning id into v_projeto_id;

  insert into public.membro_projetos (assinatura_id, usuario_id, projeto_id, funcao, status)
  values (p_assinatura_id, v_user_id, v_projeto_id, 'GESTOR', true);

  return (select to_jsonb(p) from public.projetos p where p.id = v_projeto_id);
end;
$$;

-- Compatível com a tela de downgrade enquanto não existe cadastro de EPI.
create or replace function public.contar_epis_ativos_projeto(p_projeto_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select 0;
$$;

create or replace function public.fn_validar_limites_plano_alvo(
  p_assinatura_id uuid,
  p_stripe_price_id text
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limite integer;
  v_quantidade integer;
begin
  select quantidade_projetos into v_limite
  from public.plano_regras
  where stripe_price_id = p_stripe_price_id;

  if v_limite is null then
    return false;
  end if;

  select count(*)::integer into v_quantidade
  from public.projetos
  where assinatura_id = p_assinatura_id
    and coalesce(status, true);

  return coalesce(v_limite, 0) = 0 or v_quantidade <= v_limite;
end;
$$;

create or replace function public.aplicar_indicacao_parceiro(p_parceiro_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := lower(trim(coalesce(p_parceiro_codigo, '')));
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;

  if not exists (select 1 from public.parceiros where lower(codigo) = v_codigo and ativo) then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrado');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.fn_provisionar_gestor_oauth(text, text, text, uuid, text, text) from public, anon;
revoke all on function public.fn_vincular_assinatura_checkout_pendente(uuid) from public, anon;
revoke all on function public.criar_projeto_avulso(text, uuid) from public, anon;
revoke all on function public.fn_pode_claim_checkout_assinatura(uuid, text, uuid) from public, anon;

grant execute on function public.fn_provisionar_gestor_oauth(text, text, text, uuid, text, text) to authenticated, service_role;
grant execute on function public.fn_vincular_assinatura_checkout_pendente(uuid) to authenticated, service_role;
grant execute on function public.criar_projeto_avulso(text, uuid) to authenticated, service_role;
grant execute on function public.aplicar_indicacao_parceiro(text) to authenticated, service_role;
grant execute on function public.contar_epis_ativos_projeto(uuid) to authenticated, service_role;
grant execute on function public.fn_validar_limites_plano_alvo(uuid, text) to service_role;

grant select on public.plano_regras to anon, authenticated, service_role;
grant select, insert, update, delete on public.assinaturas to authenticated, service_role;
grant select, insert, update, delete on public.usuarios to authenticated, service_role;
grant select, insert, update, delete on public.projetos to authenticated, service_role;
grant select, insert, update, delete on public.membro_projetos to authenticated, service_role;
grant select, insert on public.historico_alteracao_projetos to authenticated, service_role;
grant select on public.parceiros to anon, authenticated, service_role;
grant select on public.comunicados_sistema to authenticated, service_role;
grant select, insert on public.comunicados_dismiss to authenticated, service_role;
grant select on public.suporte_orientacoes to anon, authenticated, service_role;
grant select, insert, update on public.log_webhooks to service_role;
alter table public.plano_regras enable row level security;
alter table public.assinaturas enable row level security;
alter table public.usuarios enable row level security;
alter table public.projetos enable row level security;
alter table public.membro_projetos enable row level security;
alter table public.historico_alteracao_projetos enable row level security;
alter table public.parceiros enable row level security;
alter table public.comunicados_sistema enable row level security;
alter table public.comunicados_dismiss enable row level security;
alter table public.suporte_orientacoes enable row level security;
alter table public.log_webhooks enable row level security;

create policy "qualquer um lê os planos"
  on public.plano_regras for select
  to anon, authenticated
  using (true);

create policy "a pessoa lê a própria ficha"
  on public.usuarios for select
  to authenticated
  using (id = auth.uid() or public.usuario_pertence_assinatura(assinatura_id));

create policy "a pessoa atualiza a própria ficha"
  on public.usuarios for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "membro lê a assinatura"
  on public.assinaturas for select
  to authenticated
  using (proprietario_id = auth.uid() or public.usuario_pertence_assinatura(id));

create policy "dono atualiza a assinatura"
  on public.assinaturas for update
  to authenticated
  using (proprietario_id = auth.uid())
  with check (proprietario_id = auth.uid());

create policy "membro lê os projetos"
  on public.projetos for select
  to authenticated
  using (public.usuario_pertence_assinatura(assinatura_id));

create policy "membro atualiza os projetos"
  on public.projetos for update
  to authenticated
  using (public.usuario_pertence_assinatura(assinatura_id))
  with check (public.usuario_pertence_assinatura(assinatura_id));

create policy "membro lê os vínculos"
  on public.membro_projetos for select
  to authenticated
  using (public.usuario_pertence_assinatura(assinatura_id));

create policy "membro grava vínculos"
  on public.membro_projetos for insert
  to authenticated
  with check (public.usuario_pertence_assinatura(assinatura_id));

create policy "membro atualiza vínculos"
  on public.membro_projetos for update
  to authenticated
  using (public.usuario_pertence_assinatura(assinatura_id))
  with check (public.usuario_pertence_assinatura(assinatura_id));

create policy "membro remove vínculos"
  on public.membro_projetos for delete
  to authenticated
  using (public.usuario_pertence_assinatura(assinatura_id));

create policy "membro lê o histórico do projeto"
  on public.historico_alteracao_projetos for select
  to authenticated
  using (
    exists (
      select 1 from public.projetos p
      where p.id = projeto_id
        and public.usuario_pertence_assinatura(p.assinatura_id)
    )
  );

create policy "público lê parceiro ativo"
  on public.parceiros for select
  to anon, authenticated
  using (ativo = true);

create policy "usuário lê comunicados ativos"
  on public.comunicados_sistema for select
  to authenticated
  using (ativo = true);

create policy "usuário lê o que já dispensou"
  on public.comunicados_dismiss for select
  to authenticated
  using (usuario_id = auth.uid());

create policy "usuário dispensa um comunicado"
  on public.comunicados_dismiss for insert
  to authenticated
  with check (usuario_id = auth.uid());

create policy "público lê a ajuda"
  on public.suporte_orientacoes for select
  to anon, authenticated
  using (true);

-- log_webhooks fica só para a chave de serviço (edge do Stripe). Sem policy = ninguém pelo navegador.

-- ── Arquivos (logo e foto) ──────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('logos', 'logos', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "público vê logos"
  on storage.objects for select
  to public
  using (bucket_id = 'logos');

create policy "membro envia logo"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos');

create policy "membro troca logo"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos');

create policy "público vê fotos"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "pessoa envia a própria foto"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pessoa troca a própria foto"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
