/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // One canonical address. Sign-in stores a short-lived cookie on the address it starts on and Google
      // returns to https://cardhoondo.com, so anyone who starts on www.cardhoondo.com would lose that cookie
      // and the sign-in would fail. Also keeps search engines from indexing two copies of the site.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.cardhoondo.com" }],
        destination: "https://cardhoondo.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
