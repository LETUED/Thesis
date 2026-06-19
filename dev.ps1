# THESIS 로컬 개발 런처 — 백엔드 + 프론트 + stripe listen 을 한 번에 켜고/끈다.
#
# 사용:  dev up | down | status | restart | logs
#   up      : 3개 서비스 기동. stripe 의 webhook 시크릿(whsec)을 backend/.env 에 자동 주입.
#   down    : 3개 모두 종료.
#   status  : 각 서비스 헬스 + 포트 확인.
#   restart : down 후 up.
#   logs    : 최근 로그 꼬리 출력.
#
# 왜 스크립트인가: Docker 대비 핫리로드가 빠르고, stripe 의 webhook 시크릿을
# .env 에 자동으로 꽂아주는 게 핵심 편의다.

param(
  [Parameter(Position = 0)]
  [ValidateSet('up', 'down', 'status', 'restart', 'logs')]
  [string]$cmd = 'status'
)

$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$be      = Join-Path $root 'backend'
$fe      = Join-Path $root 'frontend'
$py      = Join-Path $be   '.venv\Scripts\python.exe'
$stripe  = Join-Path $root '.tools\stripe\stripe.exe'
$logs    = Join-Path $root '.tools\logs'
$pidFile = Join-Path $root '.tools\dev-pids.json'
$envFile = Join-Path $be   '.env'

function Get-EnvVal([string]$name) {
  $line = Get-Content $envFile -ErrorAction SilentlyContinue |
    Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
  if ($line) { return ($line -replace "^\s*$name\s*=\s*", '').Trim() }
  return $null
}

function Set-EnvVal([string]$name, [string]$value) {
  # 다른 줄/주석은 보존하고 해당 키 줄만 교체(없으면 추가). BOM 없는 UTF-8 로 저장.
  $lines = @(Get-Content $envFile -ErrorAction SilentlyContinue)
  $found = $false
  $out = foreach ($l in $lines) {
    if ($l -match "^\s*$name\s*=") { $found = $true; "$name=$value" } else { $l }
  }
  if (-not $found) { $out = @($out) + "$name=$value" }
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($envFile, ($out -join "`r`n") + "`r`n", $enc)
}

function Stop-Port([int]$port) {
  # 포트가 빌 때까지 반복(uvicorn --reload 워커가 소켓을 상속해 한 번에 안 죽는 경우 대비).
  for ($i = 0; $i -lt 6; $i++) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) { return }
    $conns.OwningProcess | Select-Object -Unique | ForEach-Object {
      try { Stop-Process -Id $_ -Force -ErrorAction Stop } catch {}
    }
    Start-Sleep -Milliseconds 500
  }
}

function Test-Url([string]$url) {
  try { (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 0 }
}

function Color([int]$code) { if ($code -eq 200) { 'Green' } else { 'Red' } }

# 주의: 파라미터명에 $args(예약 자동변수)를 쓰면 인자 바인딩이 깨진다 → $svcArgs 사용.
function Start-Svc([string]$file, [string[]]$svcArgs, [string]$wd, [string]$logname) {
  $out = Join-Path $logs "$logname.log"
  $err = Join-Path $logs "$logname.err.log"
  return (Start-Process -FilePath $file -ArgumentList $svcArgs -WorkingDirectory $wd `
      -RedirectStandardOutput $out -RedirectStandardError $err `
      -WindowStyle Hidden -PassThru).Id
}

function Dev-Down {
  if (Test-Path $pidFile) {
    try {
      $pids = Get-Content $pidFile -Raw | ConvertFrom-Json
      foreach ($p in $pids.PSObject.Properties.Value) {
        try { Stop-Process -Id $p -Force -ErrorAction Stop } catch {}
      }
    } catch {}
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }
  # uvicorn --reload 가 남기는 고아 워커(소켓 상속·commandline 미조회) 정리 — backend venv python 한정.
  # Get-Process 의 .Path 는 CIM commandline 과 달리 워커도 읽히므로 경로로 안전하게 좁힌다.
  Get-Process -Name python -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -and $_.Path.StartsWith($be, [System.StringComparison]::OrdinalIgnoreCase) } |
    ForEach-Object { try { Stop-Process -Id $_.Id -Force -ErrorAction Stop } catch {} }
  Stop-Port 8000
  Stop-Port 3000
  Get-Process -Name 'stripe' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Write-Host "[down] 백엔드/프론트/stripe 종료" -ForegroundColor Yellow
}

function Dev-Up {
  New-Item -ItemType Directory -Force -Path $logs | Out-Null
  Dev-Down
  Start-Sleep -Milliseconds 400
  $pids = @{}

  # 1) stripe webhook 시크릿을 동기적으로 받아 .env 에 주입(--print-secret).
  #    listen 의 forwarding 과 동일한 시크릿이다(계정당 고정). 그 뒤 백엔드를 띄운다.
  $sk = Get-EnvVal 'STRIPE_SECRET_KEY'
  if ((Test-Path $stripe) -and $sk) {
    $raw = (& $stripe listen --print-secret --api-key $sk 2>&1 | Out-String)
    if ($raw -match 'whsec_[0-9A-Za-z]+') {
      Set-EnvVal 'STRIPE_WEBHOOK_SECRET' $Matches[0]
      Write-Host "[stripe] whsec 주입 완료 ($($Matches[0].Substring(0,16))...)" -ForegroundColor Green
    } else {
      Write-Host "[stripe] ⚠ whsec 미수신 — 기존 .env 값 유지" -ForegroundColor Red
    }
    $pids.stripe = Start-Svc $stripe @('listen', '--api-key', $sk, '--forward-to', 'localhost:8000/api/stripe/webhook') $root 'stripe'
  } else {
    Write-Host "[stripe] 건너뜀 (CLI 또는 STRIPE_SECRET_KEY 없음)" -ForegroundColor DarkGray
  }

  # 2) 백엔드 (whsec 가 .env 에 들어간 뒤 기동). --reload: app/ 변경 시 자동 재시작(라이브).
  $pids.backend = Start-Svc $py @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--log-level', 'warning', '--reload', '--reload-dir', 'app') $be 'backend'

  # 3) 프론트 (npm run dev — cmd 경유가 Windows 에서 안정적)
  $pids.frontend = Start-Svc "$env:ComSpec" @('/c', 'npm', 'run', 'dev') $fe 'frontend'

  ($pids | ConvertTo-Json) | Set-Content $pidFile -Encoding utf8
  Write-Host ""
  Write-Host "[up] 기동 중... (몇 초 후 status 로 확인)" -ForegroundColor Cyan
  Write-Host "  백엔드   http://localhost:8000/docs"
  Write-Host "  프론트   http://localhost:3000"
  Write-Host "  로그     .tools\logs\  (dev logs 로 꼬리 확인)"
}

function Wait-Up([int]$timeoutSec = 35) {
  # 백엔드는 무거운 import(yfinance/pandas/stripe) 로 바인딩이 늦다 — 헬스가 뜰 때까지 폴링.
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    if ((Test-Url 'http://127.0.0.1:8000/api/health') -eq 200 -and
        (Test-Url 'http://127.0.0.1:3000/login') -eq 200) { break }
    Start-Sleep -Milliseconds 1000
  }
}

function Dev-Status {
  $b = Test-Url 'http://127.0.0.1:8000/api/health'
  $f = Test-Url 'http://127.0.0.1:3000/login'
  $sRun = [bool](Get-Process -Name 'stripe' -ErrorAction SilentlyContinue)
  Write-Host ("백엔드  :8000  -> " + $(if ($b -eq 200) { 'UP (200)' } else { "DOWN ($b)" })) -ForegroundColor (Color $b)
  Write-Host ("프론트  :3000  -> " + $(if ($f -eq 200) { 'UP (200)' } else { "DOWN ($f)" })) -ForegroundColor (Color $f)
  Write-Host ("stripe listen -> " + $(if ($sRun) { 'running' } else { 'stopped' })) -ForegroundColor $(if ($sRun) { 'Green' } else { 'DarkGray' })
}

function Dev-Logs {
  foreach ($n in 'backend', 'frontend', 'stripe') {
    $f = Join-Path $logs "$n.log"
    Write-Host "==== $n ====" -ForegroundColor Cyan
    if (Test-Path $f) { Get-Content $f -Tail 12 } else { Write-Host "(로그 없음)" -ForegroundColor DarkGray }
  }
}

switch ($cmd) {
  'up'      { Dev-Up;  Wait-Up; Dev-Status }
  'down'    { Dev-Down }
  'restart' { Dev-Down; Start-Sleep 1; Dev-Up; Wait-Up; Dev-Status }
  'status'  { Dev-Status }
  'logs'    { Dev-Logs }
}
