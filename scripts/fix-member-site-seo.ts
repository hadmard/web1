import { PrismaClient } from "@prisma/client";
import { normalizeMemberSiteSettingsWithSource } from "../lib/member-site-settings";
import { containsHistoricalSeoNoise } from "../lib/member-site-seo";

const prisma = new PrismaClient();

function summarize(value: string) {
  return value.length <= 80 ? value : `${value.slice(0, 77)}...`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        startsWith: "member_site_settings:",
      },
    },
    select: {
      key: true,
      value: true,
    },
    orderBy: {
      key: "asc",
    },
  });

  let scanned = 0;
  let changed = 0;

  for (const row of rows) {
    scanned += 1;

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(row.value) as Record<string, unknown>;
    } catch {
      parsed = {};
    }

    const beforeSeo =
      parsed.seo && typeof parsed.seo === "object" ? (parsed.seo as Record<string, unknown>) : {};
    const beforeTitle = typeof beforeSeo.title === "string" ? beforeSeo.title : "";
    const beforeDescription = typeof beforeSeo.description === "string" ? beforeSeo.description : "";
    const memberId = row.key.replace(/^member_site_settings:/, "");
    const enterprise = await prisma.enterprise.findUnique({
      where: { memberId },
      select: {
        companyName: true,
        companyShortName: true,
        intro: true,
        positioning: true,
        productSystem: true,
        region: true,
        area: true,
      },
    });
    const normalized = normalizeMemberSiteSettingsWithSource(parsed, enterprise ?? {});

    const afterTitle = normalized.seo.title;
    const afterDescription = normalized.seo.description;
    const shouldFix =
      beforeTitle !== afterTitle ||
      beforeDescription !== afterDescription ||
      containsHistoricalSeoNoise(beforeTitle) ||
      containsHistoricalSeoNoise(beforeDescription) ||
      !beforeTitle.trim() ||
      !beforeDescription.trim();

    if (!shouldFix) continue;

    changed += 1;
    console.log(
      JSON.stringify(
        {
          mode: apply ? "apply" : "dry-run",
          key: row.key,
          before: {
            title: summarize(beforeTitle),
            description: summarize(beforeDescription),
          },
          after: {
            title: summarize(afterTitle),
            description: summarize(afterDescription),
          },
        },
        null,
        2,
      ),
    );

    if (!apply) continue;

    await prisma.appSetting.update({
      where: { key: row.key },
      data: {
        value: JSON.stringify({
          ...parsed,
          seo: {
            ...beforeSeo,
            title: afterTitle,
            description: afterDescription,
          },
        }),
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        scanned,
        changed,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
