# Company Migration Runbook

Date: 2026-03-25

## Goal

Migrate legacy `/company` data into the new site as:

- `Member`
- `Enterprise`
- `Brand`
- optional future `Award`

This runbook is non-interactive by design.

## Input Files

Required:

- legacy company export JSON

Optional:

- member binding map JSON

Sample input shape:

- [custom/samples/legacy-company-import-sample.json](/t:/2026新网站资料/web1/custom/samples/legacy-company-import-sample.json)

## Legacy Export Environment

To fetch the real legacy `/company` dataset, set these environment variables first:

- `LEGACY_SSH_HOST`
- `LEGACY_SSH_USER`
- `LEGACY_SSH_PASSWORD`
- `LEGACY_MYSQL_HOST`
- `LEGACY_MYSQL_PORT`
- `LEGACY_MYSQL_DB`
- `LEGACY_MYSQL_USER`
- `LEGACY_MYSQL_PASSWORD`

Then run:

```powershell
npm run fetch:legacy-companies
```

This will output:

- `custom/data/legacy-companies-raw.jsonl`
- `custom/data/legacy-companies-export.json`

## Commands

### 1. Dry-run only

```powershell
powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts/run-company-migration.ps1 -InputPath <legacy-company-json>
```

Effect:

- does not write database
- prints normalized preview
- outputs report JSON under `custom/reports`

### 2. Dry-run with member map

```powershell
powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts/run-company-migration.ps1 -InputPath <legacy-company-json> -MemberMap <member-map-json>
```

### 3. Apply import

```powershell
powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts/run-company-migration.ps1 -InputPath <legacy-company-json> -Mode apply
```

Effect:

- automatically runs DB backup first
- then runs import apply mode
- outputs import report JSON under `custom/reports`

### 4. Apply import and sync member type

```powershell
powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts/run-company-migration.ps1 -InputPath <legacy-company-json> -MemberMap <member-map-json> -Mode apply -SyncMemberType
```

## Automatic Backup

Apply mode automatically calls:

- [scripts/backup-postgres-db.ps1](/t:/2026新网站资料/web1/scripts/backup-postgres-db.ps1)

Backup output:

- `custom/backups/postgres-backup-<timestamp>.dump`

The backup script removes Prisma-only `schema=` query params before calling `pg_dump`.

## Reports

Dry-run and apply both emit JSON report files under:

- `custom/reports`

Current wrapper:

- [scripts/run-company-migration.ps1](/t:/2026新网站资料/web1/scripts/run-company-migration.ps1)

Core importer:

- [scripts/import-legacy-companies-v2.ts](/t:/2026新网站资料/web1/scripts/import-legacy-companies-v2.ts)

## Current Guarantees

- non-interactive
- no Y/N prompt
- single-command execution
- automatic DB backup before apply
- report output after run
- can bind existing members via member map
- can create member + enterprise + brand together
- preserves VIP into:
  - `Member.memberType`
  - `Member.rankingWeight`
  - `Brand.isRecommend`
  - `Brand.sortOrder`
  - `Brand.displayTemplate`

## Pre-Launch Checklist

Before production apply:

1. Confirm legacy company export is complete.
2. Confirm member map if existing accounts must be reused.
3. Run dry-run and review report.
4. Verify logo URLs do not break.
5. Run apply mode.
6. Verify:
   - `/brands`
   - `/brands/all`
   - 3 enterprise detail pages
   - `/membership/admin/brands`

## Current Status

The real legacy `/company` export JSON is now present in this repository:

- `custom/data/legacy-companies-export.json`

The remaining decision is operational rather than technical:

- whether to run `apply` mode against the current database
- whether an explicit member map is needed before apply
