import { NextRequest, NextResponse } from "next/server";
import { LEGACY_SITE_URL } from "@/lib/public-site-config";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const target = new URL("/document/preview", LEGACY_SITE_URL);

  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  return NextResponse.redirect(target, 307);
}
