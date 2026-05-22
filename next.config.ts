import path from "path";
import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net",
      "script-src-elem 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.notion.com https://www.notion.com https://notion.so https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google-analytics.com https://www.googletagmanager.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://securepubads.g.doubleclick.net",
      "worker-src 'self' blob:",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://googleads.g.doubleclick.net https://securepubads.g.doubleclick.net",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
