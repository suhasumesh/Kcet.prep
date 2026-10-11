/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs', 'nodemailer'],
    // Next keeps the last payload of a dynamic page on the client for 30s.
    // On a site whose whole point is "here is how you are doing", that means
    // finishing a test and finding your own result missing from your totals.
    // Every page here is cheap to re-render, so none of them are cached.
    staleTimes: { dynamic: 0, static: 0 },
  },

  // `next dev` and `next build` must not share an output directory. They do by
  // default, so a production build run while the dev server is up deletes the
  // chunks that server is still serving — the page loads but every CSS and JS
  // request 404s until dev is restarted.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
};
export default nextConfig;
