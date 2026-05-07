param(
  [string]$Version = "2026.03.1"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot "neo4j-runtime"
$archiveName = "neo4j-community-$Version-windows.zip"
$downloadUrl = "https://neo4j.com/artifact.php?name=$archiveName"
$archivePath = Join-Path $runtimeRoot $archiveName
$extractRoot = Join-Path $runtimeRoot "neo4j-community-$Version"
$confPath = Join-Path $extractRoot "conf\\neo4j.conf"
$pluginsPath = Join-Path $extractRoot "plugins"
$gdsSource = Join-Path $extractRoot "products\\neo4j-graph-data-science-2026.03.0.jar"
$gdsTarget = Join-Path $pluginsPath "neo4j-graph-data-science-2026.03.0.jar"
$apocSource = Join-Path $extractRoot "labs\\apoc-2026.03.1-core.jar"
$apocTarget = Join-Path $pluginsPath "apoc-2026.03.1-core.jar"

function Set-Or-AppendSetting {
  param(
    [string[]]$Content,
    [string]$Key,
    [string]$Value
  )

  $pattern = "^(#\s*)?$([regex]::Escape($Key))=.*$"
  $replacement = "$Key=$Value"

  if ($Content -match $pattern) {
    return $Content -replace $pattern, $replacement
  }

  return $Content + $replacement
}

New-Item -ItemType Directory -Force $runtimeRoot | Out-Null

if (!(Test-Path $extractRoot)) {
  Write-Host "Neo4j $Version indiriliyor..."
  curl.exe -L $downloadUrl --output $archivePath

  Write-Host "Neo4j arsivi aciliyor..."
  Expand-Archive -Path $archivePath -DestinationPath $runtimeRoot -Force
}

New-Item -ItemType Directory -Force $pluginsPath | Out-Null

if (Test-Path $gdsSource) {
  Copy-Item $gdsSource $gdsTarget -Force
}

if (Test-Path $apocSource) {
  Copy-Item $apocSource $apocTarget -Force
}

$content = Get-Content $confPath
$content = Set-Or-AppendSetting -Content $content -Key "server.default_listen_address" -Value "127.0.0.1"
$content = Set-Or-AppendSetting -Content $content -Key "server.http.listen_address" -Value ":7474"
$content = Set-Or-AppendSetting -Content $content -Key "server.bolt.listen_address" -Value ":7687"
$content = Set-Or-AppendSetting -Content $content -Key "dbms.security.auth_enabled" -Value "false"
$content = Set-Or-AppendSetting -Content $content -Key "dbms.security.procedures.allowlist" -Value "gds.*,apoc.*"
$content = Set-Or-AppendSetting -Content $content -Key "dbms.security.procedures.unrestricted" -Value "gds.*,apoc.*"
Set-Content -Path $confPath -Value $content

$envPath = Join-Path $projectRoot ".env"
if (!(Test-Path $envPath)) {
  Copy-Item (Join-Path $projectRoot ".env.example") $envPath
}

Write-Host ""
Write-Host "Neo4j hazirlandi."
Write-Host "Sonraki adimlar:"
Write-Host "  npm run neo4j:start"
Write-Host "  npm install"
Write-Host "  npm start"
