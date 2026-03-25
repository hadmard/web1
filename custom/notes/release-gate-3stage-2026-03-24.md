# Website Release Gate: Dev -> Frontend -> SEO/GEO

Date: 2026-03-24

## Core Principle

Website technical changes must follow this order:

1. Site must not break
2. Search traffic must not drop
3. AI recommendation / GEO becomes easier

This order must not be reversed.

## Release Rule

Any technical change that may affect pages, routing, templates, rendering, data structure, or SEO signals must pass all three checks before release.

No "developer finished -> direct deploy" flow is allowed.

## Three Review Gates

### 1. Development Check

Owner: Development

Must confirm:

- Build passes
- No runtime error
- No broken API contract
- No circular redirect
- No new 404 caused by routing changes
- Legacy compatibility rules still work
- Scripts are non-interactive and repeatable

Required output:

- Modified file list
- Build / script result
- Risk note

Sign-off sentence:

- "功能可运行，站点不坏。"

### 2. Frontend Check

Owner: Frontend / Product visual review

Must confirm:

- Desktop page can be viewed normally
- Mobile page can be viewed normally
- Key entry pages do not collapse or overlap
- No blank screen / broken image / layout shift
- Navigation, hero, list, detail page all readable
- New content structure matches expected information hierarchy

Required output:

- Key page screenshots
- Visual regression notes
- Affected page list

Sign-off sentence:

- "页面能看。"

### 3. SEO / GEO Check

Owner: SEO / Search / AI discoverability review

Must confirm:

- Canonical and index rules are still correct
- Old URLs return 200 or 301, not accidental 404
- No redirect confusion
- Sitemap / robots / route rules remain consistent
- Structured page hierarchy is still crawlable
- AI-readable summary, title, and category relationships are not broken
- Search-result landing pages still open to matching content types

Required output:

- Batch URL verification result
- Redirect rule summary
- Search / legacy URL impact note

Sign-off sentence:

- "搜索能抓，AI能读。"

## Mandatory Pre-Release Checklist

Every release that touches routing, templates, rendering, category structure, member content, old URLs, or SEO-facing fields must include:

- Development check completed
- Frontend check completed
- SEO/GEO check completed
- Evidence attached
- Final approver recorded

## No-Release Conditions

Release must be blocked if any of the following is true:

- Page opens with wrong template
- Search result lands on mismatched content
- Legacy URL becomes 404 without approved deprecation strategy
- Mobile / desktop rendering diverges unexpectedly
- Redirect rules are changed without batch verification
- Only local verification exists, but production has not been checked

## Required Release Evidence

For every related release, keep:

- File change list
- Verification command or script used
- Output files such as CSV / TXT / screenshots
- Impact explanation
- Final sign-off result for all three gates

## Standard Approval Record

Use this exact format:

- Development: pass / fail
- Frontend: pass / fail
- SEO/GEO: pass / fail
- Release decision: allow / block

Release is allowed only when all three are `pass`.
