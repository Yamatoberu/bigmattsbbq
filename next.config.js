/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/review",
        destination: "https://g.page/r/CeLcycUsx16aEAI/review",
        permanent: false
      }
    ];
  }
};

module.exports = nextConfig;
