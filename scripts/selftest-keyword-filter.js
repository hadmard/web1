const { execFileSync } = require("node:child_process");

execFileSync(
  process.execPath,
  [
    require.resolve("ts-node/dist/bin.js"),
    "--transpile-only",
    "-r",
    "tsconfig-paths/register",
    "-P",
    "scripts/tsconfig.scripts.json",
    "scripts/selftest-keyword-filter-runner.ts",
  ],
  {
    stdio: "inherit",
    cwd: process.cwd(),
  },
);
