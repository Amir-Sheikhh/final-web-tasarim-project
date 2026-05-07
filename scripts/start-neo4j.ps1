$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot "neo4j-runtime"
$neo4jHome = Get-ChildItem $runtimeRoot -Directory -Filter "neo4j-community-*" | Sort-Object Name -Descending | Select-Object -First 1
$pidFile = Join-Path $runtimeRoot "neo4j-console.pid"

if (!$neo4jHome) {
  throw "Neo4j kurulu degil. Once 'npm run neo4j:setup' calistirin."
}

$bat = Join-Path $neo4jHome.FullName "bin\\neo4j.bat"

function Test-Port {
  param([int]$Port)

  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $client.Connect("127.0.0.1", $Port)
    $client.Dispose()
    return $true
  } catch {
    return $false
  }
}

if (Test-Path $pidFile) {
  $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue

  if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
    Write-Host "Neo4j zaten calisiyor."
    Write-Host "Neo4j Bolt: bolt://127.0.0.1:7687"
    Write-Host "Neo4j Browser: http://127.0.0.1:7474"
    exit 0
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

Write-Host "Neo4j baslatiliyor..."
$process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$bat`" console" -WorkingDirectory $neo4jHome.FullName -WindowStyle Hidden -PassThru
Set-Content -Path $pidFile -Value $process.Id

$deadline = (Get-Date).AddSeconds(60)
do {
  Start-Sleep -Seconds 2
  $boltReady = Test-Port -Port 7687
  $httpReady = Test-Port -Port 7474
} until (($boltReady -and $httpReady) -or (Get-Date) -gt $deadline)

if (!($boltReady -and $httpReady)) {
  throw "Neo4j beklenen surede hazir olmadi. Loglari kontrol edin: $($neo4jHome.FullName)\\logs"
}

Write-Host "Neo4j Bolt: bolt://127.0.0.1:7687"
Write-Host "Neo4j Browser: http://127.0.0.1:7474"
