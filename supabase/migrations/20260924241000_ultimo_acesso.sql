-- O perfil registra quando a pessoa entrou pela última vez.
alter table public.usuarios
  add column if not exists ultimo_acesso timestamptz;
