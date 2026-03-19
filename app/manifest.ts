import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#f7f6f3",
    icons: [
      {
        src: absoluteUrl("/icon.png?v=20260316"),
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: absoluteUrl("/icon.png?v=20260316"),
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
