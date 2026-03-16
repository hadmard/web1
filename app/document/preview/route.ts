import { NextRequest, NextResponse } from "next/server";
import { LEGACY_SITE_URL } from "@/lib/public-site-config";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  const target = new URL("/index.php", LEGACY_SITE_URL);

  target.searchParams.set("m", "content");
  target.searchParams.set("c", "index");
  target.searchParams.set("a", "show");

  if (id) {
    target.searchParams.set("id", id);
  }

  request.nextUrl.searchParams.forEach((value, key) => {
    if (!target.searchParams.has(key)) {
      target.searchParams.append(key, value);
    }
  });

  return NextResponse.redirect(target, 307);
}
