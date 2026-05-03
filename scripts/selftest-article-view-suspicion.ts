import assert from "node:assert/strict";
import {
  isSelfOrEmptyArticleReferer,
  shouldSkipArticleViewCountForSuspicion,
} from "../lib/article-view-suspicion";

const ARTICLE_SLUG = "demo-article";
const KNOWN_BAD_ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36";
const KNOWN_BAD_WINDOWS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36";
const NORMAL_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("self referer is recognized but not suspicious by itself", () => {
  assert.equal(
    isSelfOrEmptyArticleReferer(`https://cnzhengmu.com/news/${ARTICLE_SLUG}`, ARTICLE_SLUG),
    true
  );

  const decision = shouldSkipArticleViewCountForSuspicion({
    articleSlug: ARTICLE_SLUG,
    userAgent: NORMAL_UA,
    referer: `https://cnzhengmu.com/news/${ARTICLE_SLUG}`,
    stats: {
      uaDistinctIpCount: 2,
      uaTotalCount: 2,
      ipTotalCount: 1,
    },
  });

  assert.equal(decision.suspicious, false);
});

test("known bad Android UA with proxy-pool history is suspicious", () => {
  const decision = shouldSkipArticleViewCountForSuspicion({
    articleSlug: ARTICLE_SLUG,
    userAgent: KNOWN_BAD_ANDROID_UA,
    referer: `https://cnzhengmu.com/news/${ARTICLE_SLUG}`,
    stats: {
      uaDistinctIpCount: 46,
      uaTotalCount: 526,
      ipTotalCount: 15,
    },
  });

  assert.equal(decision.suspicious, true);
  assert.equal(decision.reason, "known_ua_proxy_pool");
});

test("known bad Windows Chrome 92 UA with proxy-pool history is suspicious", () => {
  const decision = shouldSkipArticleViewCountForSuspicion({
    articleSlug: ARTICLE_SLUG,
    userAgent: KNOWN_BAD_WINDOWS_UA,
    referer: "",
    stats: {
      uaDistinctIpCount: 30,
      uaTotalCount: 80,
      ipTotalCount: 12,
    },
  });

  assert.equal(decision.suspicious, true);
});

test("normal UA is not suspicious without proxy-pool pattern", () => {
  const decision = shouldSkipArticleViewCountForSuspicion({
    articleSlug: ARTICLE_SLUG,
    userAgent: NORMAL_UA,
    referer: "https://www.baidu.com/link?url=test",
    stats: {
      uaDistinctIpCount: 5,
      uaTotalCount: 10,
      ipTotalCount: 1,
    },
  });

  assert.equal(decision.suspicious, false);
});

test("legacy Chrome 92 only becomes suspicious with proxy-pool pattern and self referer", () => {
  const proxyPoolDecision = shouldSkipArticleViewCountForSuspicion({
    articleSlug: ARTICLE_SLUG,
    userAgent: KNOWN_BAD_WINDOWS_UA,
    referer: `https://www.cnzhengmu.com/news/${ARTICLE_SLUG}`,
    stats: {
      uaDistinctIpCount: 30,
      uaTotalCount: 90,
      ipTotalCount: 2,
    },
  });
  assert.equal(proxyPoolDecision.suspicious, true);
  assert.equal(proxyPoolDecision.reason, "known_ua_proxy_pool");

  const insufficientHistoryDecision = shouldSkipArticleViewCountForSuspicion({
    articleSlug: ARTICLE_SLUG,
    userAgent: KNOWN_BAD_WINDOWS_UA,
    referer: `https://www.cnzhengmu.com/news/${ARTICLE_SLUG}`,
    stats: {
      uaDistinctIpCount: 3,
      uaTotalCount: 6,
      ipTotalCount: 1,
    },
  });
  assert.equal(insufficientHistoryDecision.suspicious, false);
});

console.log("article view suspicion selftest passed");
