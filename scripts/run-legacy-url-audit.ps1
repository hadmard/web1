param(
    [string]$List = "",
    [string]$OutputDir = "custom/reports"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ConfirmPreference = "None"
$ProgressPreference = "SilentlyContinue"
$InformationPreference = "Continue"
$PSDefaultParameterValues["*:Confirm"] = $false

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$verifyScript = Join-Path $scriptDir "verify-legacy-urls.ps1"

$argsToPass = @()
if ($List) {
    $argsToPass += "--list=$List"
}
if ($OutputDir) {
    $argsToPass += "--output-dir=$OutputDir"
}

& powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $verifyScript @argsToPass
exit $LASTEXITCODE
