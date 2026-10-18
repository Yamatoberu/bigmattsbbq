/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Recovery callbacks contain single-use credentials.
  logging: { incomingRequests: { ignore: [/\/auth\/callback(?:\?|$)/] } },
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
