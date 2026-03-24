# Legacy News Alias Routing

Date: 2026-03-24

## Purpose

Some old search results land directly on alias paths under `jiu`, instead of passing through the new site's redirect rules.

Current confirmed problematic alias:

- `/news/cnews`

That old alias served a broken legacy template on `jiu`, so it must redirect to the maintained new-site landing page instead of continuing to expose the old page.

## Current Rule

- `https://jiu.cnzhengmu.com/news/cnews`
  -> `301`
  -> `https://cnzhengmu.com/news/enterprise`

## Why This Exists

- Search engines may index the `jiu` alias URL directly.
- Fixing only `https://cnzhengmu.com/news/cnews` is not enough.
- The old-site entry layer must also normalize the direct `jiu` alias path.

## Repro Script

- [upgrade-jiu-news-alias-redirects.php](/t:/2026新网站资料/web1/scripts/upgrade-jiu-news-alias-redirects.php)
