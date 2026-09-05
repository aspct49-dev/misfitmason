/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Roobet serves player tier badges from its own CDN.
    remotePatterns: [{ protocol: 'https', hostname: 'roobet.com' }],
  },
};

export default nextConfig;
