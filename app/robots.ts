import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

const BASE = getSiteUrl();
const DISALLOW_PATHS = ["/api/", "/membership/", "/search"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
      {
        userAgent: ["Baiduspider", "Baiduspider-image", "360Spider", "Sogou web spider", "bingbot", "Googlebot", "Googlebot-Image", "Yandex"],
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "Claude-Web", "PerplexityBot", "CCBot", "Bytespider"],
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
    ],
    host: BASE,
    sitemap: `${BASE}/sitemap.xml`,
  };
}
