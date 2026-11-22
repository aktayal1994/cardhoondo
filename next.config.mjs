/** @type {import('next').NextConfig} */
const nextConfig = {
  // Car pages share one ranking calculation during a build; the default 60 seconds was once too short for it.
  staticPageGenerationTimeout: 180,
  // One build worker: parallel prerendering of the guide pages made Supabase cancel queries with a statement
  // timeout (three failed production builds on 22 Nov 2026; same fix as the Cloudflare build notes).
  experimental: { cpus: 1 },
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
  async headers() {
    return [
      // Edge browsers were re-checking the tab icon hundreds of times a minute (15 Nov 2026), which eats the
      // hosting plan's request allowance. Letting browsers keep it for a week removes the repeat checks.
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
