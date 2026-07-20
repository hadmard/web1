# Production release deployment policy

The only supported production entry point is:

```text
node scripts/deploy-production-release.mjs --target <full-commit-or-release-tag> \
  --confirm-current <printed-current-sha> --confirm-target <printed-target-sha>
```

The command must be run from `/home/web1`. Direct file copies from Codex worktrees,
`rsync`/`scp` source overlays, `git reset origin/main`, and production builds outside
this guard are prohibited. Cron, systemd timers, CI jobs, and BT/aaPanel tasks that
write to `/home/web1` must remain disabled.

Before approval, run the non-mutating review commands in the clean release worktree:

```text
node scripts/deploy-production-release.mjs --dry-run --target <full-target-sha>
node scripts/smoke-pagination-readonly.mjs --dry-run
```

The deployer accepts only the remote release-branch head or a matching release tag.
It refuses a dirty production worktree, prints the current and target commits, builds
and tests an isolated Git worktree, and activates only after the preflight smoke test.
It never copies `.env`, never runs a database migration/seed/push command, and never
uses a Codex temporary workspace as source.

Admin smoke authentication is supplied only through the process environment as
`SMOKE_ADMIN_COOKIE` (preferred) or `SMOKE_ADMIN_BEARER`. Credentials must not be
written to this repository, shell history, command arguments, logs, or backup files.
Alternatively, `SMOKE_CREATE_READONLY_ADMIN_SESSION=1` creates a ten-minute cookie
in memory from the existing `JWT_SECRET` and a read-only admin lookup. All smoke
requests are GET requests and all remaining Prisma operations are count queries.

Each deployment writes a manifest, Git source bundle, and runtime backup beneath
`/home/web1-release-backups`. `.env` and database configuration are excluded. If a
post-activation check fails, the script switches back to the recorded pre-deployment
commit, restores the prior `.next` runtime, and restarts `web1.service`.
