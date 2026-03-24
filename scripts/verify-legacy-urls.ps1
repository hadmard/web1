param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ArgsFromCaller
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ConfirmPreference = "None"
$ProgressPreference = "SilentlyContinue"
$InformationPreference = "Continue"
$PSDefaultParameterValues["*:Confirm"] = $false
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "verify-legacy-urls.mjs"
$repoRoot = Split-Path -Parent $scriptDir
$reportDir = Join-Path $repoRoot "custom\\reports"
$logPath = Join-Path $reportDir "legacy-url-check-run-latest.log"

if (-not (Test-Path $nodeScript)) {
    Write-Error "Missing Node verifier script: $nodeScript"
    exit 1
}

if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$header = @(
    "Legacy URL audit run"
    "StartedAt=$([DateTime]::UtcNow.ToString('o'))"
    "Args=$($ArgsFromCaller -join ' ')"
    "---"
)
$header | Set-Content -Path $logPath -Encoding UTF8

& node $nodeScript @ArgsFromCaller 2>&1 |
    ForEach-Object { "$_" } |
    Tee-Object -FilePath $logPath -Append
exit $LASTEXITCODE
