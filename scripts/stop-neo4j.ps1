$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot "neo4j-runtime"
$neo4jHome = Get-ChildItem $runtimeRoot -Directory -Filter "neo4j-community-*" | Sort-Object Name -Descending | Select-Object -First 1
$pidFile = Join-Path $runtimeRoot "neo4j-console.pid"

if (!$neo4jHome) {
  throw "Neo4j kurulu degil."
}

Write-Host "Neo4j durduruluyor..."

$stopped = $false

if (Test-Path $pidFile) {
  $processId = Get-Content $pidFile -ErrorAction SilentlyContinue

  if ($processId -and (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
    cmd /c "taskkill /PID $processId /T /F" | Out-Null
    $stopped = $true
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

if (!$stopped) {
  $cmdProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "cmd.exe" -and $_.CommandLine -like "*neo4j-community-*\\bin\\neo4j.bat* console*"
  }

  foreach ($process in $cmdProcesses) {
    cmd /c "taskkill /PID $($process.ProcessId) /T /F" | Out-Null
    $stopped = $true
  }
}

if (!$stopped) {
  $javaProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "java.exe" -and $_.CommandLine -like "*neo4j-community-*"
  }

  foreach ($process in $javaProcesses) {
    cmd /c "taskkill /PID $($process.ProcessId) /F" | Out-Null
    $stopped = $true
  }
}

if ($stopped) {
  Write-Host "Neo4j durduruldu."
} else {
  Write-Host "Calisan bir Neo4j sureci bulunamadi."
}
