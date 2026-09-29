/** @type {import('next').NextConfig} */
const config = {
  experimental: {cpus: 1, serverActions: {bodySizeLimit: '12mb'}},
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {protocol: 'https', hostname: '**.fbcdn.net'},
      {protocol: 'https', hostname: '**.cdninstagram.com'},
      {protocol: 'https', hostname: '**.googleusercontent.com'},
      {protocol: 'https', hostname: 'i.ytimg.com'},
      {protocol: 'https', hostname: '**.tiktokcdn.com'},
    ],
  },
};
export default config;
