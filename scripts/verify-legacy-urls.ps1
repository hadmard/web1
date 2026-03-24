param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ArgsFromCaller
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "verify-legacy-urls.mjs"

if (-not (Test-Path $nodeScript)) {
    Write-Error "Missing Node verifier script: $nodeScript"
    exit 1
}

& node $nodeScript @ArgsFromCaller
exit $LASTEXITCODE
