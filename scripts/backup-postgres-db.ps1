param(
  [string]$OutputDir = "custom/backups"
)

$ErrorActionPreference = "Stop"
$ConfirmPreference = "None"
$ProgressPreference = "SilentlyContinue"
$PSDefaultParameterValues["*:Confirm"] = $false

function Get-DatabaseUrl {
  if ($env:DATABASE_URL) {
    return $env:DATABASE_URL
  }

  $envFile = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) ".env"
  if (-not (Test-Path $envFile)) {
    throw "DATABASE_URL not found in environment and .env is missing."
  }

  foreach ($line in Get-Content -Path $envFile -Encoding UTF8) {
    if ($line -match '^\s*DATABASE_URL\s*=\s*"?(.+?)"?\s*$') {
      return $matches[1]
    }
  }

  throw "DATABASE_URL not found in .env."
}

function Normalize-DatabaseUrlForPgDump([string]$url) {
  if ($url -notmatch "\?") {
    return $url
  }

  $parts = $url -split "\?", 2
  $base = $parts[0]
  $query = $parts[1]
  $kept = @()

  foreach ($pair in ($query -split "&")) {
    if (-not $pair) {
      continue
    }

    $segments = $pair -split "=", 2
    $key = $segments[0]
    if ($key -eq "schema") {
      continue
    }

    $kept += $pair
  }

  if ($kept.Count -eq 0) {
    return $base
  }

  return "$base?$(($kept -join "&"))"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$databaseUrl = Normalize-DatabaseUrlForPgDump (Get-DatabaseUrl)
$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
$outputPath = Join-Path $repoRoot "$OutputDir/postgres-backup-$timestamp.dump"

New-Item -ItemType Directory -Force -Path (Split-Path -Path $outputPath -Parent) | Out-Null

Write-Host "[db-backup] target=$outputPath"
& pg_dump --dbname="$databaseUrl" --format=custom --file "$outputPath" --no-password
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  throw "pg_dump failed with exit code $exitCode."
}

Write-Host "[db-backup] completed"
Write-Host "[db-backup] output=$outputPath"
