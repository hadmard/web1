/** @type {import('next').NextConfig} */
const legacyNewsSectionAliasRedirects = [
  { section: "cnews", destination: "/news/enterprise" },
  { section: "logdiary", destination: "https://jiu.cnzhengmu.com/news/logdiary" },
  { section: "home", destination: "https://jiu.cnzhengmu.com/news/home" },
  { section: "brand", destination: "https://jiu.cnzhengmu.com/news/brand" },
  { section: "choose", destination: "https://jiu.cnzhengmu.com/news/choose" },
  { section: "collocation", destination: "https://jiu.cnzhengmu.com/news/collocation" },
];
const legacyNewsStaticSections = ["baoguang", "hangye", "jingpei", "qiye", "shichang", "top10"];
const legacyAcademySections = ["jingying", "lingxiu", "zhuanjia"];
const legacyTopicSections = ["kannanxun", "shanghaijianbohui"];
const buyingInternalLinkFallbackRedirects = [
  "/brands/buying/zheng-mu-ding-zhi-duo-shao-qian-yi-ping",
  "/brands/buying/zheng-mu-ding-zhi-yu-suan-zen-me-kong-zhi",
  "/brands/buying/zheng-mu-ding-zhi-zen-me-xuan-pin-pai",
];
const sampleLegacyArticleRedirects = [
  { source: "/news/qiye/129759.html", destination: "/news/ju-shi-jiang-cheng-zhi-ling-zheng-zhuang-zhong-guo-fan-jia-ju-chuang-xin-lun-tan" },
  { source: "/companynews/10665932-182579728.html", destination: "/news/si-lu-qi-dian-she-ji-xin-zhang-2025-xi-an-dang-dai-she-ji-zhou-sheng-da-qi-mu" },
  { source: "/news/qiye/129029.html", destination: "/news/ao-mu-zhi-neng-hu-yan-deng-shang-shi-yong-dong-ni-de-dong-tai-zi-ran-guang-da-za" },
  { source: "/companynews/10665932-182579618.html", destination: "/news/20-wan-ren-ci-gong-fu-xi-bu-she-ji-kuang-huan-2025-xi-an-dang-dai-she-ji-zhou-yu" },
  { source: "/companynews/10665932-182579062.html", destination: "/news/ke-ji-yin-ling-xiao-liang-ling-xian-an-ji-er-shang-yong-zhi-ji-xi-lie-xin-pin-fa" },
  { source: "/news/shichang/130093.html", destination: "/news/2025-nian-shi-jie-lin-mu-ye-da-hui-ji-2025-nian-guang-xi-guo-ji-lin-chan-pin-ji-" },
  { source: "/companynews/10665932-182579200.html", destination: "/news/ao-shi-mi-si-hei-ke-ji-tu-po-quan-shi-gao-shui-xiao-heng-jing-xi-tong-zhong-su-b" },
  { source: "/news/qiye/129235.html", destination: "/news/ma-lai-xi-ya-guo-ji-jia-ju-zhan-zhun-bei-jiu-xu-wei-2025-nian-ya-zhou-cai-gou-ji" },
  { source: "/news/qiye/129331.html", destination: "/news/chun-zhan-xin-pian-shou-zhan-gao-jie-wu-han-zheng-zhuang-ding-zhi-jia-ju-zhan-yu" },
  { source: "/news/hangye/130005.html", destination: "/news/ye-ji-ni-liu-er-shang-san-ke-shu-jing-li-run-da-zhang-chao-90-fang-shui-cai-liao" },
];

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      ...buyingInternalLinkFallbackRedirects.map((source) => ({
        source,
        destination: "/brands/buying",
        permanent: false,
      })),
      ...sampleLegacyArticleRedirects.map(({ source, destination }) => ({
        source,
        destination,
        statusCode: 301,
      })),
      {
        source: "/list-:id.html",
        destination: "https://jiu.cnzhengmu.com/list-:id.html",
        permanent: false,
      },
      {
        source: "/list-:id-:page.html",
        destination: "https://jiu.cnzhengmu.com/list-:id-:page.html",
        permanent: false,
      },
      {
        source: "/about",
        destination: "https://jiu.cnzhengmu.com/about/",
        permanent: false,
      },
      {
        source: "/about/",
        destination: "https://jiu.cnzhengmu.com/about/",
        permanent: false,
      },
      {
        source: "/gonggao",
        destination: "https://jiu.cnzhengmu.com/gonggao/",
        permanent: false,
      },
      {
        source: "/gonggao/",
        destination: "https://jiu.cnzhengmu.com/gonggao/",
        permanent: false,
      },
      {
        source: "/company/:id.html",
        destination: "https://jiu.cnzhengmu.com/company/:id.html",
        permanent: false,
      },
      {
        source: "/company/view-:id.html",
        destination: "https://jiu.cnzhengmu.com/company/:id.html",
        permanent: false,
      },
      {
        source: "/company/:id",
        destination: "https://jiu.cnzhengmu.com/company/:id.html",
        permanent: false,
      },
      {
        source: "/company_introduction/:id.html",
        destination: "https://jiu.cnzhengmu.com/company_introduction/:id.html",
        permanent: false,
      },
      {
        source: "/company_video/:id.html",
        destination: "https://jiu.cnzhengmu.com/company_video/:id.html",
        permanent: false,
      },
      {
        source: "/company_news/:id.html",
        destination: "https://jiu.cnzhengmu.com/company_news/:id.html",
        permanent: false,
      },
      {
        source: "/company_product/:id.html",
        destination: "https://jiu.cnzhengmu.com/company_product/:id.html",
        permanent: false,
      },
      {
        source: "/company_investment/:id.html",
        destination: "https://jiu.cnzhengmu.com/company_investment/:id.html",
        permanent: false,
      },
      {
        source: "/company_vr/:id.html",
        destination: "https://jiu.cnzhengmu.com/company_vr/:id.html",
        permanent: false,
      },
      {
        source: "/company_qualification/:id.html",
        destination: "https://jiu.cnzhengmu.com/company_qualification/:id.html",
        permanent: false,
      },
      {
        source: "/company_recruit/:id.html",
        destination: "https://jiu.cnzhengmu.com/company_recruit/:id.html",
        permanent: false,
      },
      {
        source: "/company_contact/:id.html",
        destination: "https://jiu.cnzhengmu.com/company_contact/:id.html",
        permanent: false,
      },
      {
        source: "/news/baitai/:slug.html",
        destination: "/news/all",
        statusCode: 301,
      },
      {
        source: "/news/baitai/:path*",
        destination: "/news/all",
        statusCode: 301,
      },
      {
        source: "/news/baitai",
        destination: "/news/all",
        statusCode: 301,
      },
      {
        source: "/news/baitai/",
        destination: "/news/all",
        statusCode: 301,
      },
      {
        source: "/news/:section/:id.html",
        destination: "https://jiu.cnzhengmu.com/news/:section/:id.html",
        permanent: false,
      },
      ...legacyNewsStaticSections.flatMap((section) => [
        {
          source: `/news/${section}`,
          destination: `https://jiu.cnzhengmu.com/news/${section}/`,
          permanent: false,
        },
        {
          source: `/news/${section}/`,
          destination: `https://jiu.cnzhengmu.com/news/${section}/`,
          permanent: false,
        },
      ]),
      ...legacyNewsSectionAliasRedirects.flatMap(({ section, destination }) => [
        {
          source: `/news/${section}`,
          destination,
          permanent: false,
        },
        {
          source: `/news/${section}/`,
          destination,
          permanent: false,
        },
      ]),
      {
        source: "/news/:id.html",
        destination: "https://jiu.cnzhengmu.com/news/:id.html",
        permanent: false,
      },
      {
        source: "/zhanhui",
        destination: "https://jiu.cnzhengmu.com/zhanhui/",
        permanent: false,
      },
      {
        source: "/zhanhui/",
        destination: "https://jiu.cnzhengmu.com/zhanhui/",
        permanent: false,
      },
      {
        source: "/zhanhui/:section/:id.html",
        destination: "https://jiu.cnzhengmu.com/zhanhui/:section/:id.html",
        permanent: false,
      },
      {
        source: "/zhanhui/:section",
        destination: "https://jiu.cnzhengmu.com/zhanhui/:section/",
        permanent: false,
      },
      {
        source: "/zhanhui/:section/",
        destination: "https://jiu.cnzhengmu.com/zhanhui/:section/",
        permanent: false,
      },
      {
        source: "/shangxueyuan/:section/:id.html",
        destination: "https://jiu.cnzhengmu.com/shangxueyuan/:section/:id.html",
        permanent: false,
      },
      {
        source: "/shangxueyuan",
        destination: "https://jiu.cnzhengmu.com/shangxueyuan/",
        permanent: false,
      },
      {
        source: "/shangxueyuan/",
        destination: "https://jiu.cnzhengmu.com/shangxueyuan/",
        permanent: false,
      },
      ...legacyAcademySections.flatMap((section) => [
        {
          source: `/shangxueyuan/${section}`,
          destination: `https://jiu.cnzhengmu.com/shangxueyuan/${section}/`,
          permanent: false,
        },
        {
          source: `/shangxueyuan/${section}/`,
          destination: `https://jiu.cnzhengmu.com/shangxueyuan/${section}/`,
          permanent: false,
        },
      ]),
      {
        source: "/zhuanti",
        destination: "https://jiu.cnzhengmu.com/zhuanti/shanghaijianbohui/",
        permanent: false,
      },
      {
        source: "/zhuanti/",
        destination: "https://jiu.cnzhengmu.com/zhuanti/shanghaijianbohui/",
        permanent: false,
      },
      ...legacyTopicSections.flatMap((section) => [
        {
          source: `/zhuanti/${section}`,
          destination: `https://jiu.cnzhengmu.com/zhuanti/${section}/`,
          permanent: false,
        },
        {
          source: `/zhuanti/${section}/`,
          destination: `https://jiu.cnzhengmu.com/zhuanti/${section}/`,
          permanent: false,
        },
      ]),
      {
        source: "/platform/:path*",
        destination: "https://jiu.cnzhengmu.com/platform/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
