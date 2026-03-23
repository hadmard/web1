/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
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
        source: "/news/:section/:id.html",
        destination: "https://jiu.cnzhengmu.com/news/:section/:id.html",
        permanent: false,
      },
      {
        source: "/news/:id.html",
        destination: "https://jiu.cnzhengmu.com/news/:id.html",
        permanent: false,
      },
      {
        source: "/zhanhui/:section/:id.html",
        destination: "https://jiu.cnzhengmu.com/zhanhui/:section/:id.html",
        permanent: false,
      },
      {
        source: "/shangxueyuan/:section/:id.html",
        destination: "https://jiu.cnzhengmu.com/shangxueyuan/:section/:id.html",
        permanent: false,
      },
      {
        source: "/platform/:path*",
        destination: "https://jiu.cnzhengmu.com/platform/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
