param(
  [string]$JsonlOutput = "custom/data/legacy-companies-raw.jsonl",
  [string]$JsonOutput = "custom/data/legacy-companies-export.json"
)

$ErrorActionPreference = "Stop"
$ConfirmPreference = "None"
$ProgressPreference = "SilentlyContinue"
$PSDefaultParameterValues["*:Confirm"] = $false

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$jsonlPath = Join-Path $repoRoot $JsonlOutput
$jsonPath = Join-Path $repoRoot $JsonOutput

function Require-Env([string]$name) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable: $name"
  }
  return $value
}

$sshHost = Require-Env "LEGACY_SSH_HOST"
$sshUser = Require-Env "LEGACY_SSH_USER"
$sshPassword = Require-Env "LEGACY_SSH_PASSWORD"
$mysqlHost = Require-Env "LEGACY_MYSQL_HOST"
$mysqlPort = Require-Env "LEGACY_MYSQL_PORT"
$mysqlDb = Require-Env "LEGACY_MYSQL_DB"
$mysqlUser = Require-Env "LEGACY_MYSQL_USER"
$mysqlPassword = Require-Env "LEGACY_MYSQL_PASSWORD"

New-Item -ItemType Directory -Force -Path (Split-Path -Path $jsonlPath -Parent) | Out-Null

$remoteScriptPath = Join-Path $env:TEMP "legacy-company-export-$([guid]::NewGuid().ToString('N')).sh"
$remoteScript = @"
mysql -N -B --default-character-set=utf8mb4 -h$mysqlHost -P$mysqlPort -u$mysqlUser -p$mysqlPassword -D $mysqlDb -e "
SELECT REPLACE(TO_BASE64(JSON_OBJECT(
  'id', c.id,
  'company_id', c.company_id,
  'name', c.name,
  'short_name', c.short_name,
  'content', c.content,
  'logo', c.logo,
  'banner', c.banner,
  'video', c.video,
  'signature', c.signature,
  'business_license', c.business_license,
  'license_code', c.license_code,
  'legal_person', c.legal_person,
  'register_capital', c.register_capital,
  'business_scope', c.business_scope,
  'start_deadline', DATE_FORMAT(c.start_deadline, '%Y-%m-%d'),
  'end_deadline', DATE_FORMAT(c.end_deadline, '%Y-%m-%d'),
  'contact', c.contact,
  'address', c.address,
  'phone', c.phone,
  'fax', c.fax,
  'email', c.email,
  'website', c.website,
  'wechat_qrcode', c.wechat_qrcode,
  'province_name', ap.name,
  'city_name', ac.name,
  'divide', c.divide,
  'tag_ids', c.tag_ids,
  'tag_names', GROUP_CONCAT(DISTINCT t.name ORDER BY t.id SEPARATOR ','),
  'domain', c.domain,
  'theme_color', c.theme_color,
  'status', c.status,
  'is_vip', c.is_vip,
  'is_vip_cate', c.is_vip_cate,
  'category', c.category,
  'user_id', u.id,
  'username', u.username,
  'user_email', u.email,
  'user_mobile', u.mobile,
  'user_password_hash', u.password_hash,
  'user_name', u.name,
  'user_nickname', u.nickname
)), '\n', '')
FROM company c
LEFT JOIN (
  SELECT company_id, MIN(user_id) AS user_id
  FROM company_user_relation
  WHERE is_delete = 0 AND status = 1
  GROUP BY company_id
) cur ON cur.company_id = c.company_id
LEFT JOIN user u ON u.id = cur.user_id AND u.is_delete = 0
LEFT JOIN area ap ON ap.id = c.province_id AND ap.is_delete = 0
LEFT JOIN area ac ON ac.id = c.city_id AND ac.is_delete = 0
LEFT JOIN tag t ON FIND_IN_SET(t.id, c.tag_ids) > 0 AND t.is_delete = 0
WHERE c.is_delete = 0 AND c.status = 1
GROUP BY c.id
ORDER BY c.id ASC;
"
"@

Set-Content -Path $remoteScriptPath -Value $remoteScript -Encoding UTF8

try {
  & 'C:\Program Files\PuTTY\plink.exe' -ssh "$sshUser@$sshHost" -pw $sshPassword -batch -m $remoteScriptPath | Out-File -FilePath $jsonlPath -Encoding utf8
  $exitCode = $LASTEXITCODE
}
finally {
  Remove-Item -LiteralPath $remoteScriptPath -Force -ErrorAction SilentlyContinue
}

if ($exitCode -ne 0) {
  throw "Legacy company export failed with exit code $exitCode."
}

node (Join-Path $repoRoot 'scripts\convert-jsonl-to-json.mjs') --input $jsonlPath --output $jsonPath
$convertExitCode = $LASTEXITCODE

if ($convertExitCode -ne 0) {
  throw "JSONL conversion failed with exit code $convertExitCode."
}

Write-Host "[legacy-company-export] jsonl=$jsonlPath"
Write-Host "[legacy-company-export] json=$jsonPath"
