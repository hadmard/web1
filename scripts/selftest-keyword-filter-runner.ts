import { validateArticleKeyword } from "../lib/news-keywords-v2";

function assert(name: string, condition: boolean) {
  if (!condition) {
    throw new Error(`Assertion failed: ${name}`);
  }
}

function main() {
  const validKeywords = [
    "整木定制",
    "木作护理",
    "木地板清洁",
    "护墙板保养",
    "整木门店",
    "老客户回访",
    "WOCA",
    "woca",
    "图森",
    "世家屋",
    "戴夫人",
    "康倍得",
    "康倍得整木",
    "图森木作",
    "世家屋原木定制",
    "戴夫人全屋定制",
    "森柏木作",
    "北境家居",
    "欧林木业",
    "德朗整木",
    "AURAWOOD",
    "NORDCARE",
    "Rubio Monocoat",
  ];

  const invalidKeywords = [
    "做整木",
    "因为整木",
    "友实地考察康倍得整木",
    "采体系选购康倍得整木",
    "统规划及整体空间木作",
    "很多家庭第一步",
    "重新连接老客户",
    "选购康倍得整木",
    "考察康倍得整木",
    "内容",
    "栏目",
    "内容优化",
  ];

  validKeywords.forEach((keyword) => {
    assert(`${keyword} should pass`, validateArticleKeyword(keyword) === true);
  });

  invalidKeywords.forEach((keyword) => {
    assert(`${keyword} should be blocked`, validateArticleKeyword(keyword) === false);
  });

  console.log("keyword filter selftest passed");
}

main();
