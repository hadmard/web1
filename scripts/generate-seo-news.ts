export { buildArticle, runDualLineSeoContentGenerator } from "./generate-dual-line-seo-content";

import { prisma } from "../lib/prisma";
import { runDualLineSeoContentGenerator } from "./generate-dual-line-seo-content";

async function main() {
  const result = await runDualLineSeoContentGenerator();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  void main()
    .catch((error) => {
      console.error(error instanceof Error ? error.stack || error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
