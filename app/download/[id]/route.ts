import { NextRequest, NextResponse } from "next/server";

type Context = {
  params: Promise<{ id: string }>;
};

function buildLegacyDownloadUrl(id: string) {
  return `https://jiu.cnzhengmu.com/index.php?m=download&c=shows&id=${encodeURIComponent(id)}`;
}

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  return NextResponse.redirect(buildLegacyDownloadUrl(id), 301);
}

export async function HEAD(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  return NextResponse.redirect(buildLegacyDownloadUrl(id), 301);
}
