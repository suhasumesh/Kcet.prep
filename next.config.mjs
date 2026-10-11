/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: { serverComponentsExternalPackages: ['mongoose', 'bcryptjs', 'nodemailer'] },

  // `next dev` and `next build` must not share an output directory. They do by
  // default, so a production build run while the dev server is up deletes the
  // chunks that server is still serving — the page loads but every CSS and JS
  // request 404s until dev is restarted.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
};
export default nextConfig;
