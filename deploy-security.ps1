<#
.SYNOPSIS
  Despliegue del endurecimiento de seguridad (Transportes GM).
  Encadena: secretos -> (pausa para migracion SQL) -> deploy worker -> deploy edge function -> deploy SPA.

.NOTES
  Ejecutar desde la raiz del repo (transportes-gm/):
      powershell -ExecutionPolicy Bypass -File .\deploy-security.ps1

  Requisitos: npx, wrangler, supabase CLI logueados; proyecto Supabase ya vinculado.
  El paso de la migracion SQL es manual a proposito (revisar el array de tablas antes).
#>

param(
  [string]$Secret,          # Si se omite, se genera uno de 32 bytes (64 hex).
  [switch]$SkipSpa,         # No intentar desplegar el SPA al final.
  [string]$EdgeFunction = "rastreo-cliente"
)

$ErrorActionPreference = "Stop"
$repoRoot   = $PSScriptRoot
$workerDir  = Join-Path $repoRoot "cloudflare-workers\wialon-proxy"
$migration  = Join-Path $repoRoot "supabase\migrations\20260609_security_hardening.sql"

function Step($n, $msg) { Write-Host "`n=== [$n] $msg ===" -ForegroundColor Cyan }
function Ok($msg)       { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg)     { Write-Host "    ERROR: $msg" -ForegroundColor Red; exit 1 }
function CheckExit($what) { if ($LASTEXITCODE -ne 0) { Fail "$what (exit $LASTEXITCODE)" } }

# ── Validaciones previas ───────────────────────────────────────────────────────
if (-not (Test-Path $workerDir))  { Fail "No encuentro el worker en $workerDir. ¿Estás en la raíz del repo?" }
if (-not (Test-Path $migration))  { Fail "No encuentro la migración $migration" }

# ── 1) Secreto compartido ──────────────────────────────────────────────────────
Step 1 "Secreto compartido (PROXY_SHARED_SECRET)"
if ([string]::IsNullOrWhiteSpace($Secret)) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $Secret = -join ($bytes | ForEach-Object { $_.ToString("x2") })
  Ok "Secreto generado (guárdalo en tu gestor de contraseñas):"
  Write-Host "    $Secret" -ForegroundColor Yellow
} else {
  Ok "Usando el secreto proporcionado."
}

# ── 2) Configurar secretos en Cloudflare y Supabase ────────────────────────────
Step 2 "Configurar secretos"
Push-Location $workerDir
try {
  Write-Host "    -> Verificando secretos existentes del worker (SUPABASE_URL / SUPABASE_SERVICE_KEY)..."
  npx wrangler secret list
  CheckExit "wrangler secret list"

  Write-Host "    -> Poniendo PROXY_SHARED_SECRET en el worker..."
  $Secret | npx wrangler secret put PROXY_SHARED_SECRET
  CheckExit "wrangler secret put"
  Ok "Secreto del worker configurado."
} finally {
  Pop-Location
}

Write-Host "    -> Poniendo PROXY_SHARED_SECRET en Supabase Functions..."
npx supabase secrets set "PROXY_SHARED_SECRET=$Secret"
CheckExit "supabase secrets set"
Ok "Secreto de Supabase configurado."

# ── 3) Migración SQL (manual) ──────────────────────────────────────────────────
Step 3 "Migración SQL (RLS) — PASO MANUAL"
Write-Host "    Abre el editor SQL de Supabase y ejecuta el contenido de:" -ForegroundColor Yellow
Write-Host "      $migration" -ForegroundColor Yellow
Write-Host "    ⚠ Revisa el array 'tablas' antes de correrlo. Luego corre las queries de VERIFICACIÓN del final."
try { Start-Process $migration } catch { }   # intenta abrirlo en tu editor
$resp = Read-Host "    ¿Ya ejecutaste la migración correctamente? (s/N)"
if ($resp -notmatch '^(s|si|sí|y|yes)$') { Fail "Migración no confirmada. Aborto antes de desplegar para no dejar el sistema inconsistente." }
Ok "Migración confirmada."

# ── 4) Deploy del worker (a partir de aquí el SPA viejo perderá GPS hasta el paso 5) ─
Step 4 "Deploy del Cloudflare Worker"
Write-Host "    (Tras esto, el SPA en producción dará 401 en GPS hasta desplegar el SPA nuevo.)" -ForegroundColor DarkYellow
Push-Location $workerDir
try {
  npx wrangler deploy
  CheckExit "wrangler deploy"
  Ok "Worker desplegado."
} finally {
  Pop-Location
}

# ── 5) Deploy de la Edge Function del portal ───────────────────────────────────
Step 5 "Deploy de la Edge Function ($EdgeFunction)"
npx supabase functions deploy $EdgeFunction
CheckExit "supabase functions deploy"
Ok "Edge function desplegada."

# ── 6) Deploy del SPA ──────────────────────────────────────────────────────────
Step 6 "Deploy del SPA (Vercel)"
if ($SkipSpa) {
  Write-Host "    Omitido (-SkipSpa). Recuerda desplegar el SPA para restaurar el GPS." -ForegroundColor DarkYellow
} elseif (Get-Command vercel -ErrorAction SilentlyContinue) {
  npx vercel --prod
  CheckExit "vercel --prod"
  Ok "SPA desplegado."
} else {
  Write-Host "    No encontré la CLI de 'vercel'. Despliega el SPA con tu flujo habitual" -ForegroundColor DarkYellow
  Write-Host "    (git push a la rama de producción, o instala la CLI: npm i -g vercel)." -ForegroundColor DarkYellow
}

# ── Fin ────────────────────────────────────────────────────────────────────────
Write-Host "`n=== COMPLETADO ===" -ForegroundColor Green
Write-Host "Verifica ahora (checklist):"
Write-Host "  - Login interno: Rastreo GPS muestra unidades en vivo."
Write-Host "  - Link /rastreo/:token muestra solo esa unidad."
Write-Host "  - https://wialon-proxy.transportesgm.workers.dev?action=positions  ->  debe dar 401."
Write-Host "  - Sitio público /unidades sigue cargando."
