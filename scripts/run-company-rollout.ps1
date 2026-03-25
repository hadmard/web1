param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [string]$MemberMap,

  [ValidateSet("dry-run", "apply")]
  [string]$Mode = "dry-run",

  [switch]$SyncMemberType,

  [switch]$SkipSiteSettings,

  [switch]$SkipBackup,

  [string]$VerifyUrlList = "",

  [string]$OutputDir = "custom/reports"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ConfirmPreference = "None"
$ProgressPreference = "SilentlyContinue"
$InformationPreference = "Continue"
$PSDefaultParameterValues["*:Confirm"] = $false
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$reportRoot = Join-Path $repoRoot $OutputDir
New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null

$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
$logPath = Join-Path $reportRoot "company-rollout-$Mode-$timestamp.log"

function Write-RunLog([string]$Message) {
  $line = "[company-rollout] $Message"
  Write-Host $line
  Add-Content -Path $logPath -Value $line -Encoding UTF8
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Script
  )

  Write-RunLog "start $Name"
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $Script 2>&1 | ForEach-Object {
      $text = "$_"
      Write-Host $text
      Add-Content -Path $logPath -Value $text -Encoding UTF8
    }
  } catch {
    $message = $_.Exception.Message
    Write-RunLog "failed $Name :: $message"
    throw
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
    Write-RunLog "failed $Name :: exit_code=$LASTEXITCODE"
    throw "$Name failed with exit code $LASTEXITCODE."
  }

  Write-RunLog "done $Name"
}

@(
  "Company rollout run"
  "StartedAt=$([DateTime]::UtcNow.ToString('o'))"
  "Mode=$Mode"
  "InputPath=$InputPath"
  "MemberMap=$MemberMap"
  "VerifyUrlList=$VerifyUrlList"
  "---"
) | Set-Content -Path $logPath -Encoding UTF8

$migrationArgs = @(
  "-NoLogo",
  "-NoProfile",
  "-NonInteractive",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  (Join-Path $PSScriptRoot "run-company-migration.ps1"),
  "-InputPath",
  $InputPath,
  "-Mode",
  $Mode,
  "-ReportDir",
  $OutputDir
)

if ($MemberMap) {
  $migrationArgs += @("-MemberMap", $MemberMap)
}

if ($SyncMemberType) {
  $migrationArgs += "-SyncMemberType"
}

if ($SkipSiteSettings) {
  $migrationArgs += "-SkipSiteSettings"
}

if ($SkipBackup) {
  $migrationArgs += "-SkipBackup"
}

Invoke-Step -Name "company-migration" -Script {
  & powershell @migrationArgs
}

Invoke-Step -Name "build" -Script {
  & npm run build
}

if ($VerifyUrlList) {
  Invoke-Step -Name "legacy-url-audit" -Script {
    & powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "run-legacy-url-audit.ps1") -List $VerifyUrlList -OutputDir $OutputDir
  }
}

Write-RunLog "completed"
Write-RunLog "log=$logPath"
