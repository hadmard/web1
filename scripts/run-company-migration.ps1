param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [string]$MemberMap,

  [ValidateSet("dry-run", "apply")]
  [string]$Mode = "dry-run",

  [switch]$SyncMemberType,

  [switch]$SkipSiteSettings,

  [string]$ReportDir = "custom/reports",

  [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
$ConfirmPreference = "None"
$ProgressPreference = "SilentlyContinue"
$PSDefaultParameterValues["*:Confirm"] = $false

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$resolvedInputPath = Resolve-Path $InputPath
$memberMapPath = if ($MemberMap) { Resolve-Path $MemberMap } else { $null }

$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
$reportPath = Join-Path $repoRoot "$ReportDir/company-migration-$Mode-$timestamp.json"

$scriptArgs = @(
  "--transpile-only",
  "scripts/import-legacy-companies-v2.ts",
  "--input",
  $resolvedInputPath.Path,
  "--report",
  $reportPath
)

if ($memberMapPath) {
  $scriptArgs += @("--member-map", $memberMapPath.Path)
}

if ($Mode -eq "apply") {
  $scriptArgs += "--apply"
}

if ($SyncMemberType) {
  $scriptArgs += "--sync-member-type"
}

if ($SkipSiteSettings) {
  $scriptArgs += "--skip-site-settings"
}

if ($Mode -eq "apply" -and -not $SkipBackup) {
  & powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "backup-postgres-db.ps1")
  $backupExitCode = $LASTEXITCODE
  if ($backupExitCode -ne 0) {
    throw "Database backup failed with exit code $backupExitCode."
  }
}

Write-Host "[company-migration] mode=$Mode"
Write-Host "[company-migration] input=$($resolvedInputPath.Path)"
if ($memberMapPath) {
  Write-Host "[company-migration] member_map=$($memberMapPath.Path)"
}
Write-Host "[company-migration] report=$reportPath"

& npx ts-node @scriptArgs
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  throw "Company migration script failed with exit code $exitCode."
}

Write-Host "[company-migration] completed"
Write-Host "[company-migration] report=$reportPath"
