# Legacy News Query Routing

Date: 2026-03-24

## Purpose

Solidify the old-site handling for legacy query URLs like:

- `/index.php?m=news&c=shows&id=207`

These URLs must not misroute to the homepage, and portal-style collected ids must not jump to a mismatched single article.

## Classification Rules

Processing order:

1. `portal-style ids`
These ids are treated as site-entry / portal-style collected URLs.
They always redirect to:

- `https://cnzhengmu.com/news/all`

2. `real article ids`
If the id is not portal-style and a matching static file exists under the old-site news tree, redirect to that exact article URL on `jiu`.

3. `unmatched ids`
If no matching static article file exists, redirect to:

- `https://cnzhengmu.com/news/all`

## Portal-Style ID Source

File:

- [legacy-news-portal-style-ids.txt](/t:/2026新网站资料/web1/scripts/legacy-news-portal-style-ids.txt)

Current confirmed ids:

- `207`

## How To Extend

1. Add the new id to [legacy-news-portal-style-ids.txt](/t:/2026新网站资料/web1/scripts/legacy-news-portal-style-ids.txt)
2. Re-run the old-site upgrade script
3. Re-verify with query-style URLs and final landing pages

## Current Runtime Behavior

- Portal-style collected URL -> `/news/all`
- Real article collected URL -> real `jiu` detail page
- Unknown / unmatched query id -> `/news/all`

## Repro Scripts

- [fix-jiu-legacy-news-query-redirect.php](/t:/2026新网站资料/web1/scripts/fix-jiu-legacy-news-query-redirect.php)
- [upgrade-jiu-legacy-news-query-redirect.php](/t:/2026新网站资料/web1/scripts/upgrade-jiu-legacy-news-query-redirect.php)
- [upgrade-jiu-legacy-news-query-redirect-v3.php](/t:/2026新网站资料/web1/scripts/upgrade-jiu-legacy-news-query-redirect-v3.php)
