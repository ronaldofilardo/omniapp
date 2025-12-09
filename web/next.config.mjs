/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
