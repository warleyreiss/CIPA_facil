# ESTE SCRIPT ERA DO CONTROLE EPI. Não rode nesta pasta.
Write-Host "PARADO. sync-supabase-remoto.ps1 aponta para o Controle EPI. Use .\scripts\supabase-cipa.ps1" -ForegroundColor Red
exit 1

# Sincroniza metadados do Supabase remoto (ControleEPI) para o repositório local.
# Uso: .\scripts\sync-supabase-remoto.ps1
# Requer: Supabase CLI logado (supabase login) e projeto já linkado.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "==> Projeto linkado:" -ForegroundColor Cyan
supabase projects list | Select-String "ControleEPI"

Write-Host "`n==> Baixando Edge Functions (--use-api, sem Docker)..." -ForegroundColor Cyan
supabase functions download --use-api

Write-Host "`n==> Listando functions remotas..." -ForegroundColor Cyan
supabase functions list

$snapshotDir = "supabase\remote_snapshot"
New-Item -ItemType Directory -Force -Path $snapshotDir | Out-Null

Write-Host "`n==> Exportando lista de tabelas..." -ForegroundColor Cyan
supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1" |
  Out-File -Encoding utf8 (Join-Path $snapshotDir "tabelas_public.json")

Write-Host "`n==> Exportando lista de RPCs..." -ForegroundColor Cyan
supabase db query --linked "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY 1" |
  Out-File -Encoding utf8 (Join-Path $snapshotDir "rpc_public.json")

Write-Host "`n==> Exportando políticas RLS..." -ForegroundColor Cyan
supabase db query --linked "SELECT schemaname, tablename, policyname, cmd, roles::text FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname" |
  Out-File -Encoding utf8 (Join-Path $snapshotDir "rls_policies.json")

Write-Host "`n==> Tentando db pull (requer Docker Desktop)..." -ForegroundColor Cyan
$dbPull = supabase db pull baseline_remoto --linked 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "db pull ignorado (Docker ausente ou erro). Use Docker + comando manual." -ForegroundColor Yellow
} else {
  Write-Host $dbPull
}

Write-Host "`nConcluído. Veja supabase/remote_snapshot/INVENTARIO_REMOTO.md" -ForegroundColor Green
