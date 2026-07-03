import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export function buildHuadianMetadata(title: string, description: string, path: string): Metadata {
  return buildPageMetadata({
    title,
    description,
    path,
    type: "website",
    absoluteTitle: true,
  });
}
