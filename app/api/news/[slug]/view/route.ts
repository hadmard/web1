import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: { slug: string } };

function normalizeSegment(raw: string) {
  let value = (raw || "").trim();
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value.trim();
}

export async function POST(_request: Request, context: Context) {
  try {
    const { slug } = context.params;
    const normalizedSlug = normalizeSegment(slug);
    if (!normalizedSlug) return NextResponse.json({ ok: true });

    await prisma.article.updateMany({
      where: {
        slug: normalizedSlug,
        status: "approved",
        OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
      },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
