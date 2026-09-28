# Comandos remotos do Supabase só para a conta da CIPA Fácil.
# Uso, na raiz do projeto:
#   .\scripts\supabase-cipa.ps1 status
#   .\scripts\supabase-cipa.ps1 push
#
# Não rode "supabase db push" direto. Este script confere o projeto linkado nesta pasta.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$acao = if ($args.Count -gt 0) { $args[0] } else { "status" }
$refProibido = "ndcpitpvaphhwoidcdhs"
$arquivoRef = "supabase\projeto-remoto.txt"
$arquivoLink = "supabase\.temp\project-ref"

function Ler-RefPermitido {
  if (-not (Test-Path $arquivoRef)) { return "" }
  foreach ($linha in Get-Content $arquivoRef) {
    $texto = $linha.Trim()
    if ($texto -and -not $texto.StartsWith("#") -and $texto.StartsWith("REF=")) {
      return $texto.Substring(4).Trim()
    }
  }
  return ""
}

function Ler-RefLinkado {
  if (-not (Test-Path $arquivoLink)) { return "" }
  return (Get-Content $arquivoLink -Raw).Trim()
}

$permitido = Ler-RefPermitido
$linkado = Ler-RefLinkado

Write-Host "Pasta: $(Get-Location)"
Write-Host "Ref permitido neste repositório: $(if ($permitido) { $permitido } else { '(vazio — push bloqueado)' })"
Write-Host "Ref linkado nesta pasta: $(if ($linkado) { $linkado } else { '(nenhum)' })"

if ($linkado -eq $refProibido) {
  Write-Host "PARADO. Esta pasta está linkada ao Controle EPI ($refProibido)." -ForegroundColor Red
  Write-Host "Rode supabase unlink nesta pasta e entre com a conta da CIPA Fácil antes de linkar o projeto novo." -ForegroundColor Red
  exit 1
}

if ($acao -eq "status") {
  if (Get-Command supabase -ErrorAction SilentlyContinue) {
    supabase projects list
  }
  exit 0
}

if ($acao -ne "push") {
  Write-Host "Use: status ou push" -ForegroundColor Yellow
  exit 1
}

if (-not $permitido) {
  Write-Host "PARADO. Preencha REF= em supabase/projeto-remoto.txt com o projeto novo da CIPA." -ForegroundColor Red
  exit 1
}

if ($permitido -eq $refProibido) {
  Write-Host "PARADO. O ref permitido não pode ser o do Controle EPI." -ForegroundColor Red
  exit 1
}

if ($linkado -ne $permitido) {
  Write-Host "PARADO. O link desta pasta ($linkado) não é o ref da CIPA ($permitido)." -ForegroundColor Red
  Write-Host "Na conta certa: supabase link --project-ref $permitido" -ForegroundColor Yellow
  exit 1
}

Write-Host "Enviando migrations só para $permitido" -ForegroundColor Green
supabase db push --yes
exit $LASTEXITCODE
