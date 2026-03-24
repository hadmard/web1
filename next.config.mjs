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

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
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
