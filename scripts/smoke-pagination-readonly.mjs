#!/usr/bin/env node

import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3103").replace(/\/$/, "");
const pageSize = 20;
const subcategories = ["trends", "enterprise", "tech", "events", "aftermarket"];

function log(message) {
  process.stdout.write(`[pagination-smoke] ${message}\n`);
}

function newsWhere(extra) {
  const newsScope = {
    OR: [
      { categoryHref: "/news" },
      { categoryHref: { startsWith: "/news/" } },
      { subHref: "/news" },
      { subHref: { startsWith: "/news/" } },
    ],
  };
  return extra ? { AND: [newsScope, extra] } : newsScope;
}

function extractNewsSlugs(html) {
  const excluded = new Set(["all", ...subcategories]);
  const slugs = new Set();
  for (const match of html.matchAll(/href=["'](?:https?:\/\/[^/]+)?\/news\/([^"'?#/]+)(?:[?#][^"']*)?["']/gi)) {
    const slug = decodeURIComponent(match[1]);
    if (!excluded.has(slug)) slugs.add(slug);
  }
  return slugs;
}

async function fetchText(path, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method: "GET", headers, redirect: "manual" });
  const text = await response.text();
  assert.equal(response.ok, true, `${path} returned ${response.status}: ${text.slice(0, 240)}`);
  return text;
}

function assertPageTotal(html, total, path) {
  const normalized = html.replace(/<!--.*?-->/gs, " ").replace(/\s+/g, " ");
  assert.match(normalized, new RegExp(`(?:共|total)[^0-9]{0,20}${total}(?:[^0-9]|$)`, "i"), `${path} does not visibly show total ${total}`);
}

async function checkPublicListing(path, total) {
  const firstHtml = await fetchText(path);
  assertPageTotal(firstHtml, total, path);
  if (total <= pageSize) {
    assert.equal(
      process.env.SMOKE_ALLOW_SMALL_FIXTURE,
      "1",
      `${path} has only ${total} approved records; page 2 cannot be tested in strict production mode`,
    );
    log(`${path}: total=${total}, single-page fixture accepted for local testing`);
    return;
  }
  const secondHtml = await fetchText(`${path}?page=2`);
  assert.match(firstHtml, /(?:page(?:=|%3D)2|下一页)/i, `${path} has no visible page-2/next-page control`);
  const first = extractNewsSlugs(firstHtml);
  const second = extractNewsSlugs(secondHtml);
  assert(first.size > 0 && second.size > 0, `${path} did not expose article slugs on both pages`);
  assert.equal([...first].some((slug) => second.has(slug)), false, `${path} page 1 and page 2 overlap`);
  log(`${path}: total=${total}, page1=${first.size}, page2=${second.size}, no overlap`);
}

async function adminHeaders(prisma) {
  const cookie = (process.env.SMOKE_ADMIN_COOKIE || "").trim();
  const bearer = (process.env.SMOKE_ADMIN_BEARER || "").trim();
  if (cookie || bearer) return cookie ? { cookie } : { authorization: `Bearer ${bearer}` };

  assert.equal(
    process.env.SMOKE_CREATE_READONLY_ADMIN_SESSION,
    "1",
    "Set SMOKE_ADMIN_COOKIE/SMOKE_ADMIN_BEARER, or explicitly enable the in-memory read-only test session",
  );
  const secret = (process.env.JWT_SECRET || "").trim();
  assert(secret.length >= 32, "JWT_SECRET must be present in the process environment for a temporary test session");
  const admin = await prisma.member.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true, role: true },
  });
  assert(admin, "a SUPER_ADMIN record is required for the temporary read-only test session");
  const token = await new SignJWT({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    adminSessionVersion: 1,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
  log("using an in-memory 10-minute admin session for GET-only checks; no credential was written");
  return { cookie: `auth=${token}` };
}

async function fetchAdmin(page, headers) {
  const path = `/api/admin/articles?page=${page}&limit=${pageSize}&tab=articles&status=approved`;
  const text = await fetchText(path, headers);
  const data = JSON.parse(text);
  for (const field of ["items", "total", "page", "limit", "totalPages"]) {
    assert(Object.hasOwn(data, field), `${path} is missing ${field}`);
  }
  assert(Array.isArray(data.items), `${path} items is not an array`);
  return data;
}

async function main() {
  if (dryRun) {
    log(`DRY RUN only; no HTTP or database connection will be made (base=${baseUrl})`);
    log("planned read-only checks: /news/all; five subcategories; admin GET pages 1, 2 and last; Prisma count queries");
    log("no POST/PATCH/PUT/DELETE request and no Prisma mutation exists in this script");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const approved = await prisma.article.count({ where: newsWhere({ status: "approved" }) });
    const expectedOverride = Number.parseInt(process.env.SMOKE_EXPECTED_APPROVED_TOTAL || "", 10);
    if (Number.isFinite(expectedOverride)) {
      assert.equal(approved, expectedOverride, `database approved count changed: expected ${expectedOverride}, got ${approved}`);
    }

    await checkPublicListing("/news/all", approved);
    for (const slug of subcategories) {
      const href = `/news/${slug}`;
      const total = await prisma.article.count({
        where: newsWhere({
          AND: [
            { status: "approved" },
            { OR: [{ subHref: href }, { categoryHref: href }] },
          ],
        }),
      });
      await checkPublicListing(href, total);
    }

    const headers = await adminHeaders(prisma);
    const first = await fetchAdmin(1, headers);
    const second = await fetchAdmin(2, headers);
    assert.equal(first.total, approved, "admin approved-news total differs from the production database count");
    assert.equal(first.page, 1);
    assert.equal(first.limit, pageSize);
    assert.equal(first.totalPages, Math.ceil(approved / pageSize));
    assert(first.totalPages > 1, "admin totalPages must be greater than 1");
    const firstIds = new Set(first.items.map((item) => item.id));
    assert.equal(second.items.some((item) => firstIds.has(item.id)), false, "admin page 1 and page 2 overlap");

    const last = await fetchAdmin(first.totalPages, headers);
    const expectedLastSize = approved % pageSize || pageSize;
    assert.equal(last.items.length, expectedLastSize, `admin last page should contain ${expectedLastSize} items`);
    if (approved === 751) {
      assert.equal(first.totalPages, 38);
      assert.equal(last.items.length, 11);
    }
    log(`admin: total=${first.total}, totalPages=${first.totalPages}, lastPage=${last.items.length}, no overlap`);
    log("PASS: all pagination checks are read-only and succeeded");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`[pagination-smoke] FAIL: ${error.stack || error.message || error}\n`);
  process.exitCode = 1;
});
