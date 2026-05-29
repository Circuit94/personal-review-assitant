/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // better-sqlite3 是 native module，需要排除在 webpack 打包之外
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
