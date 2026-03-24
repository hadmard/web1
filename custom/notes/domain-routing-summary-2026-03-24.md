# Domain Routing Summary

Updated: 2026-03-24

## Priority Order

Site changes should follow this order:

1. Keep the site working
2. Keep search traffic intact
3. Make the canonical structure easier for AI and search engines to understand

## Current Domain Roles

- Main site: `https://cnzhengmu.com`
- Compatible alias: `https://www.cnzhengmu.com`
- Legacy mobile domain: `https://m.cnzhengmu.com`
- Older legacy mobile domain: `https://newm.cnzhengmu.com`
- Archived old site: `https://jiu.cnzhengmu.com`

## Current Live Behavior

### Main site

- `https://cnzhengmu.com` returns `200`
- This is the only canonical primary domain

### Redirect aliases

- `https://www.cnzhengmu.com` redirects to `https://cnzhengmu.com/`
- `https://m.cnzhengmu.com/` redirects to `https://cnzhengmu.com/`
- `https://newm.cnzhengmu.com/` redirects to `https://cnzhengmu.com/`

### Old site

- `https://jiu.cnzhengmu.com` returns `200`
- Historical news, exhibition, and company content is still served from the old site

## Legacy Indexed Link Protection

To keep already indexed mobile links alive, `m` and `newm` do not fully redirect every request.

These legacy URL patterns are still allowed to open directly:

- `show-*.html`
- `list-*.html`

Examples verified:

- `https://m.cnzhengmu.com/show-3-117581.html`
- `https://newm.cnzhengmu.com/show-5-117858.html`
- `https://newm.cnzhengmu.com/show-8-117548.html`
- `https://newm.cnzhengmu.com/show-20-107504.html`
- `https://m.cnzhengmu.com/list-3.html`
- `https://newm.cnzhengmu.com/list-19.html`

This keeps old search and AI-crawled links alive while still sending ordinary domain entry traffic to the new primary domain.

## Why This Structure Was Chosen

### Main site stability

`cnzhengmu.com` is the only primary domain, which reduces split authority and operational confusion.

### Search retention

Old external links and indexed mobile pages are still accessible, so historical traffic is not lost.

### Better machine understanding

Search engines and AI systems can distinguish:

- primary site: `cnzhengmu.com`
- archive site: `jiu.cnzhengmu.com`
- legacy aliases: `www`, `m`, `newm`

## Certificate Status

As of 2026-03-24:

- `newm.cnzhengmu.com` certificate was renewed
- the old browser certificate warning issue was fixed

## High-Value Links Verified

- `https://cnzhengmu.com`
- `https://www.cnzhengmu.com`
- `https://m.cnzhengmu.com`
- `https://newm.cnzhengmu.com`
- `https://jiu.cnzhengmu.com`
- `https://m.cnzhengmu.com/show-3-117581.html`
- `https://newm.cnzhengmu.com/show-5-117858.html`
- `https://newm.cnzhengmu.com/show-8-117548.html`
- `https://newm.cnzhengmu.com/show-20-107504.html`
- `https://m.cnzhengmu.com/list-3.html`
- `https://newm.cnzhengmu.com/list-19.html`
- `https://jiu.cnzhengmu.com/company/981746066.html`
- `https://jiu.cnzhengmu.com/companynews/10665932-171166823.html`

## Follow-Up Recommendations

### Highest priority

Keep these three stable:

- main site
- old site
- legacy indexed mobile deep links

### Next priority

Gradually replace remaining `m.cnzhengmu.com` and `newm.cnzhengmu.com` links inside old-site pages so search engines stop discovering unnecessary legacy mobile URLs.

### Ongoing checks

After any future certificate, nginx, or domain change, re-check:

- `cnzhengmu.com`
- `www.cnzhengmu.com`
- `m.cnzhengmu.com`
- `newm.cnzhengmu.com`
- `jiu.cnzhengmu.com`
- representative `show-*.html`
- representative `list-*.html`
- old news pages
- old exhibition pages
- old company pages
