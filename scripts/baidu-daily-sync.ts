import { prisma } from "../lib/prisma";
import { getPendingBaiduPushQueue, pushApprovedNewsToBaidu, seedApprovedNewsBaiduQueue } from "../lib/baidu-submit";

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.indexOf("--limit");
  const seedArg = args.indexOf("--seed");

  const limit = Math.max(1, Math.min(100, Number.parseInt(limitArg >= 0 ? args[limitArg + 1] ?? "20" : "20", 10) || 20));
  const seedLimit = Math.max(1, Math.min(500, Number.parseInt(seedArg >= 0 ? args[seedArg + 1] ?? "200" : "200", 10) || 200));

  const startedAt = new Date().toISOString();
  const seeded = await seedApprovedNewsBaiduQueue(seedLimit);
  const queue = await getPendingBaiduPushQueue(limit);

  let attempted = 0;
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let quotaRemaining: number | null = null;
  let stoppedReason = "queue_empty";

  for (const job of queue) {
    const result = await pushApprovedNewsToBaidu(job.article, { source: "daily_retry" });

    attempted += 1;
    quotaRemaining = result.remain;

    if (result.skipped) {
      skippedCount += 1;
      continue;
    }

    if (result.error === "over quota") {
      failedCount += 1;
      stoppedReason = "over_quota";
      break;
    }

    if (result.error) {
      failedCount += 1;
      stoppedReason = "completed_with_failures";
      continue;
    }

    successCount += 1;
    stoppedReason = "completed";
  }

  const summary = {
    run_started_at: startedAt,
    run_finished_at: new Date().toISOString(),
    seeded,
    total_candidates: queue.length,
    attempted,
    success_count: successCount,
    failed_count: failedCount,
    skipped_count: skippedCount,
    quota_remaining: quotaRemaining,
    stopped_reason: stoppedReason,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
