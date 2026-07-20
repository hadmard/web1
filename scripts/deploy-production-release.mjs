#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { realpathSync } from "node:fs";
import path from "node:path";

const PRODUCTION_DIR = "/home/web1";
const RELEASE_BRANCH = "release/admin-news-pagination-20260718";
const RELEASE_TAG_PREFIX = "release-20260718-news-admin-pagination";
const RELEASE_BASE_COMMIT = "1c282775efacaea808245ee16ccb44345d32599a";
const STAGING_ROOT = "/home/web1-release-staging";
const BACKUP_ROOT = "/home/web1-release-backups";
const SERVICE = "web1.service";
const REQUIRED_COMMITS = [
  "7625103", // admin pagination cherry-pick
  "7897713", // public news pagination cherry-pick
  "b51225b", // reviewed production content hotfixes
];

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (["--dry-run"].includes(current)) {
      flags.add(current);
      continue;
    }
    if (!["--target", "--confirm-current", "--confirm-target"].includes(current)) fail(`unknown argument: ${current}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`${current} requires a value`);
    values.set(current, value);
    index += 1;
  }
  return { values, flags };
}

function run(command, args, options = {}) {
  const shown = [command, ...args].join(" ");
  process.stdout.write(`[release-deploy] $ ${shown}\n`);
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stderr || result.stdout || ""}` : "";
    fail(`${shown} exited with ${result.status}${detail}`);
  }
  return options.capture ? (result.stdout || "").trim() : "";
}

function git(args, cwd, capture = true) {
  return run("git", args, { cwd, capture });
}

function assertClean(cwd, label) {
  const status = git(["status", "--porcelain=v1", "--untracked-files=all"], cwd);
  assert.equal(status, "", `${label} is dirty; deployment refuses to overwrite or hide changes:\n${status}`);
}

function isAncestor(commit, target, cwd) {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", commit, target], { cwd, stdio: "ignore" });
  return result.status === 0;
}

async function waitForHttp(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  fail(`server did not become ready at ${url}: ${lastError?.message || "timeout"}`);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 8_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function main() {
  const { values, flags } = parseArgs(process.argv.slice(2));
  const requestedTarget = values.get("--target");
  assert(requestedTarget, "--target <full-commit-or-release-tag> is mandatory");
  const dryRun = flags.has("--dry-run");
  const appDir = dryRun ? process.cwd() : PRODUCTION_DIR;

  if (!dryRun) {
    assert.equal(realpathSync(process.cwd()), realpathSync(PRODUCTION_DIR), `run only from ${PRODUCTION_DIR}`);
    if (typeof process.loadEnvFile === "function" && existsSync(path.join(PRODUCTION_DIR, ".env"))) {
      process.loadEnvFile(path.join(PRODUCTION_DIR, ".env"));
    }
    git(["fetch", "--tags", "origin", RELEASE_BRANCH], appDir, false);
  }

  assertClean(appDir, dryRun ? "release worktree" : "production worktree");
  const current = git(["rev-parse", "HEAD"], appDir);
  const target = git(["rev-parse", `${requestedTarget}^{commit}`], appDir);
  assert.match(target, /^[0-9a-f]{40}$/);

  if (!dryRun) {
    const remoteRelease = git(["rev-parse", `refs/remotes/origin/${RELEASE_BRANCH}`], appDir);
    const tagRef = `refs/tags/${requestedTarget}`;
    const tagExists = spawnSync("git", ["show-ref", "--verify", "--quiet", tagRef], { cwd: appDir }).status === 0;
    const approvedTag = tagExists && requestedTarget.startsWith(RELEASE_TAG_PREFIX) && git(["rev-parse", `${tagRef}^{commit}`], appDir) === target;
    assert(target === remoteRelease || approvedTag, `target must be origin/${RELEASE_BRANCH} HEAD or a ${RELEASE_TAG_PREFIX}* tag`);
  }

  for (const commit of REQUIRED_COMMITS) {
    assert(isAncestor(commit, target, appDir), `target does not contain required release commit ${commit}`);
  }
  assert(isAncestor(RELEASE_BASE_COMMIT, target, appDir), `target is not based on ${RELEASE_BASE_COMMIT}`);

  process.stdout.write(`[release-deploy] current production commit -> target commit\n[release-deploy] ${current} -> ${target}\n`);
  if (dryRun) {
    process.stdout.write("[release-deploy] DRY RUN: validated clean worktree, explicit target, fixed release-base ancestry and required commits\n");
    process.stdout.write("[release-deploy] DRY RUN: no fetch, install, build, service action, database action or filesystem activation was performed\n");
    return;
  }

  assert.equal(values.get("--confirm-current"), current, "--confirm-current must exactly match the printed current commit");
  assert.equal(values.get("--confirm-target"), target, "--confirm-target must exactly match the printed target commit");
  // A lockfile change would require an explicit runtime dependency swap plan.
  git(["diff", "--quiet", current, target, "--", "package-lock.json"], appDir);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const stageDir = path.join(STAGING_ROOT, `${target.slice(0, 12)}-${stamp}`);
  const backupDir = path.join(BACKUP_ROOT, `${current.slice(0, 12)}-${stamp}`);
  assert(stageDir.startsWith(`${STAGING_ROOT}/`) && backupDir.startsWith(`${BACKUP_ROOT}/`));
  mkdirSync(STAGING_ROOT, { recursive: true });
  mkdirSync(backupDir, { recursive: false });

  writeFileSync(path.join(backupDir, "manifest.txt"), `current=${current}\ntarget=${target}\ncreated=${new Date().toISOString()}\n.env excluded=true\ndatabase modified=false\n`);
  git(["bundle", "create", path.join(backupDir, "source.bundle"), "--all"], appDir, false);
  if (existsSync(path.join(appDir, ".next"))) {
    run("tar", ["-C", appDir, "-czf", path.join(backupDir, "next-runtime.tgz"), ".next"], { capture: false });
  }

  let stageServer;
  let activated = false;
  let oldNextMoved = false;
  try {
    git(["worktree", "add", "--detach", stageDir, target], appDir, false);
    run("npm", ["ci", "--no-audit", "--no-fund"], { cwd: stageDir, capture: false });
    run("npm", ["run", "build"], { cwd: stageDir, capture: false });

    const preflightPort = process.env.RELEASE_PREFLIGHT_PORT || "3198";
    const preflightUrl = `http://127.0.0.1:${preflightPort}`;
    stageServer = spawn("npm", ["run", "start", "--", "-p", preflightPort], {
      cwd: stageDir,
      env: { ...process.env, PORT: preflightPort },
      stdio: ["ignore", "inherit", "inherit"],
    });
    await waitForHttp(`${preflightUrl}/news/all`);
    run("node", ["scripts/smoke-pagination-readonly.mjs"], {
      cwd: stageDir,
      env: { ...process.env, SMOKE_BASE_URL: preflightUrl },
      capture: false,
    });
    await stopChild(stageServer);
    stageServer = undefined;

    assertClean(appDir, "production worktree before activation");
    git(["switch", "--detach", target], appDir, false);
    activated = true;
    const currentNext = path.join(appDir, ".next");
    const savedNext = path.join(backupDir, "next-runtime-live");
    if (existsSync(currentNext)) {
      renameSync(currentNext, savedNext);
      oldNextMoved = true;
    }
    renameSync(path.join(stageDir, ".next"), currentNext);
    run("systemctl", ["restart", SERVICE], { capture: false });
    await waitForHttp(`${process.env.SMOKE_BASE_URL || "http://127.0.0.1:3103"}/news/all`);
    run("node", ["scripts/smoke-pagination-readonly.mjs"], { cwd: appDir, capture: false });
    assertClean(appDir, "production worktree after activation");
    writeFileSync(path.join(backupDir, "DEPLOYED"), `${current} -> ${target}\n`);
    process.stdout.write(`[release-deploy] SUCCESS ${current} -> ${target}; rollback commit=${current}\n`);
  } catch (error) {
    await stopChild(stageServer);
    if (activated) {
      process.stderr.write(`[release-deploy] activation failed; rolling back to ${current}\n`);
      const failedNext = path.join(backupDir, `failed-next-${target.slice(0, 12)}`);
      if (existsSync(path.join(appDir, ".next"))) renameSync(path.join(appDir, ".next"), failedNext);
      git(["switch", "--detach", current], appDir, false);
      const savedNext = path.join(backupDir, "next-runtime-live");
      if (oldNextMoved && existsSync(savedNext)) renameSync(savedNext, path.join(appDir, ".next"));
      run("systemctl", ["restart", SERVICE], { capture: false });
    }
    throw error;
  } finally {
    if (existsSync(stageDir)) {
      const result = spawnSync("git", ["worktree", "remove", "--force", stageDir], { cwd: appDir, stdio: "inherit" });
      if (result.status !== 0 && stageDir.startsWith(`${STAGING_ROOT}/`)) rmSync(stageDir, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  process.stderr.write(`[release-deploy] FAIL: ${error.stack || error.message || error}\n`);
  process.exitCode = 1;
});
