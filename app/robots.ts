import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

const BASE = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/membership/", "/search"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
