/** @type {import('next').NextConfig} */
const config = { experimental: { cpus: 1, serverActions: { bodySizeLimit: '12mb' } }, poweredByHeader: false };
export default config;
