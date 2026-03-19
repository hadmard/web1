import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${SITE_NAME}</ShortName>
  <Description>${SITE_DESCRIPTION}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
  <Language>zh-CN</Language>
  <Url type="text/html" method="get" template="${absoluteUrl("/search")}?q={searchTerms}"/>
  <Image height="64" width="64" type="image/png">${absoluteUrl("/icon.png?v=20260316")}</Image>
</OpenSearchDescription>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/opensearchdescription+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
