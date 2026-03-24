import { NextRequest, NextResponse } from "next/server";

type Context = {
  params: Promise<{ id: string }>;
};

function buildLegacyProductUrl(id: string) {
  return `https://jiu.cnzhengmu.com/company_product/${encodeURIComponent(id)}.html`;
}

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  return NextResponse.redirect(buildLegacyProductUrl(id), 301);
}

export async function HEAD(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  return NextResponse.redirect(buildLegacyProductUrl(id), 301);
}
