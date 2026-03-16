/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/news/:section/:id.html",
        destination: "https://jiu.cnzhengmu.com/news/:section/:id.html",
        permanent: false,
      },
      {
        source: "/zhanhui/:section/:id.html",
        destination: "https://jiu.cnzhengmu.com/zhanhui/:section/:id.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
