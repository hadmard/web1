import { NextResponse } from "next/server";
import { SHARE_CACHE_VERSION, buildPublicNewsUrl } from "@/lib/share-config";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const target = new URL(buildPublicNewsUrl(slug));
  target.searchParams.set("sharev", SHARE_CACHE_VERSION);

  return NextResponse.redirect(target, { status: 307 });
}
