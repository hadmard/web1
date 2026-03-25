# Company Rollout Non-Interactive Baseline

Date: 2026-03-25

## Goal

Provide one repeatable command for the legacy `/company` migration flow without any interactive confirmation.

This baseline is now:

- non-interactive
- no Y/N prompt
- one-command execution
- single-run log output
- optional legacy URL verification

## Single Command

```powershell
powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts/run-company-rollout.ps1 -InputPath <legacy-company-json> -Mode dry-run -VerifyUrlList custom/samples/company-rollout-verify-urls.txt
```

NPM shortcut:

```powershell
npm run run:company-rollout -- -InputPath <legacy-company-json> -Mode dry-run -VerifyUrlList custom/samples/company-rollout-verify-urls.txt
```

## What It Does

1. Runs the company migration wrapper.
2. Runs `npm run build`.
3. Optionally runs legacy URL verification.
4. Writes a single run log to `custom/reports/company-rollout-<mode>-<timestamp>.log`.

## Related Scripts

- [scripts/run-company-rollout.ps1](/t:/2026新网站资料/web1/scripts/run-company-rollout.ps1)
- [scripts/run-company-migration.ps1](/t:/2026新网站资料/web1/scripts/run-company-migration.ps1)
- [scripts/backup-postgres-db.ps1](/t:/2026新网站资料/web1/scripts/backup-postgres-db.ps1)
- [scripts/run-legacy-url-audit.ps1](/t:/2026新网站资料/web1/scripts/run-legacy-url-audit.ps1)
- [scripts/verify-legacy-urls.mjs](/t:/2026新网站资料/web1/scripts/verify-legacy-urls.mjs)

## Verification Input

Default sample verification list:

- [custom/samples/company-rollout-verify-urls.txt](/t:/2026新网站资料/web1/custom/samples/company-rollout-verify-urls.txt)

## Notes

- `apply` mode still performs automatic DB backup first unless `-SkipBackup` is explicitly set.
- Single URL failures in the verification phase are recorded and do not stop the whole batch.
- This baseline is intended to replace temporary hand-typed command sequences.
