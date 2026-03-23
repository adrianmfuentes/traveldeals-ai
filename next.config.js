const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Allow importing files from outside this app's root (platform-core)
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    // When platform-core files import 'next-auth', 'next-intl', etc.,
    // resolve them from this app's node_modules (platform-core has none).
    config.resolve.modules.push(path.resolve(__dirname, 'node_modules'));
    return config;
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // Prevent clickjacking
        { key: "X-Frame-Options", value: "DENY" },
        // Prevent MIME sniffing
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Referrer leakage control
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Disable FLoC / reduce fingerprinting surface
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        },
        // Force HTTPS in production (2 years, include subdomains)
        ...(process.env.NODE_ENV === "production"
          ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
          : []),
        // Content Security Policy
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Next.js requires unsafe-inline for styles in dev; nonces are the production fix
            "style-src 'self' 'unsafe-inline'",
            // Next.js SSR hydration requires unsafe-inline/unsafe-eval in dev
            process.env.NODE_ENV === "production"
              ? "script-src 'self' 'unsafe-inline'"
              : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            // API calls only to self
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
      ],
    },
  ],
};

module.exports = withNextIntl(nextConfig);
