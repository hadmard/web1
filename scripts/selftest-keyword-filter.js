const KEYWORD_MARKETING_TERMS = ["都", "了", "一个", "这个", "那个", "问题", "错误", "为什么", "如何", "严重", "千万不要", "一定要"];
const KEYWORD_PUNCTUATION = /[，。:：；;！？!?%]/;
const KEYWORD_MULTI_DIGITS = /\d{2,}/;
const STOPWORDS = ["的", "了", "是", "在", "与", "及", "也", "又", "将", "等", "为", "于", "之", "本次", "本届", "此次", "相关", "进行", "表示", "提到", "发布", "点击", "详情", "官网"];
const BRAND_BLACKLIST = ["中国", "全国", "本次", "本届", "行业", "家居行业", "定制行业", "企业代表", "相关负责人"];

function normalizeText(input) {
  return String(input || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampKeywordLength(input) {
  return input.length >= 2 && input.length <= 10;
}

function isNoiseKeyword(input) {
  return (
    !input ||
    !/[A-Za-z0-9\u4e00-\u9fa5]/.test(input) ||
    STOPWORDS.includes(input) ||
    BRAND_BLACKLIST.includes(input)
  );
}

function countMatchedTerms(input, terms) {
  return terms.reduce((count, term) => count + (input.includes(term) ? 1 : 0), 0);
}

function isValidKeywordCandidate(text) {
  const input = normalizeText(text);
  if (!input || !clampKeywordLength(input)) return false;
  if (isNoiseKeyword(input)) return false;
  if (KEYWORD_PUNCTUATION.test(input)) return false;
  if (KEYWORD_MULTI_DIGITS.test(input)) return false;
  if (countMatchedTerms(input, KEYWORD_MARKETING_TERMS) >= 2) return false;
  if (/[A-Za-z0-9]+\s+[A-Za-z0-9]+/.test(input)) return false;
  if (/的|了|在|如何|为什么|不要|一定要/.test(input) && input.length >= 6) return false;
  return /^[A-Za-z0-9\u4e00-\u9fa5]+$/.test(input);
}

function shouldEnterPending(brandName, articleTitle, articleBody) {
  if (!isValidKeywordCandidate(brandName)) return false;
  const bodyText = normalizeText(articleBody);
  const titleText = normalizeText(articleTitle);
  const bodyFrequency = bodyText ? bodyText.split(brandName).length - 1 : 0;
  const inTitle = titleText.includes(brandName);
  return bodyFrequency > 0 && (inTitle || bodyFrequency > 0);
}

function assert(name, condition) {
  if (!condition) {
    throw new Error(`Assertion failed: ${name}`);
  }
}

function main() {
  const validKeywords = ["整木定制", "高定木作", "定制家具"];
  const invalidKeywords = [
    "80%企业都在一个小问题上，犯了严重错误",
    "千万不要再给AI投毒了",
    "如何避免一个严重错误",
    "80%增长",
  ];

  validKeywords.forEach((keyword) => assert(`${keyword} should pass`, isValidKeywordCandidate(keyword) === true));
  invalidKeywords.forEach((keyword) => assert(`${keyword} should be blocked`, isValidKeywordCandidate(keyword) === false));

  assert(
    "title-only marketing phrase should not enter pending",
    shouldEnterPending("千万不要再给AI投毒了", "千万不要再给AI投毒了", "这是一篇行业观察正文") === false,
  );
  assert(
    "title-only new brand should not enter pending",
    shouldEnterPending("新锐木作", "新锐木作亮相设计周", "正文只提到了整木定制和护墙板") === false,
  );
  assert(
    "body-mentioned new brand can enter pending",
    shouldEnterPending("新锐木作", "新锐木作亮相设计周", "新锐木作带来整木定制方案。") === true,
  );

  console.log("keyword filter selftest passed");
}

main();
