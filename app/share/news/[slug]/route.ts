import { NextResponse } from "next/server";
import { SHARE_CACHE_VERSION } from "@/lib/share-config";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: Context) {
  const { slug } = await params;
  const url = new URL(request.url);
  const target = new URL(`/news/${slug}`, url.origin);
  target.searchParams.set("sharev", SHARE_CACHE_VERSION);

  return NextResponse.redirect(target, { status: 307 });
}
