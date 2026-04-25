const path = require("node:path");

const createNextIntlPlugin = require("next-intl/plugin");

const isDev = process.env.NODE_ENV === "development";
const isStaticExport = process.env.NODE_ENV === "production" && process.env.PLATFORM_TARGET === "static";
const outputFileTracingRoot = path.join(__dirname, "..");

// Static export targets cannot rely on Next.js runtime rewrites or response
// headers, so those features stay enabled only for the server-rendered web path.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const connectSrc = isDev
  ? "connect-src 'self' https: ws://localhost:* http://localhost:*"
  : "connect-src 'self' https:";

const nextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "192.168.1.2",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://192.168.1.2:3000"
  ],
  outputFileTracingRoot,
  reactStrictMode: true,
  devIndicators: false,
  env: {
    PLATFORM_TARGET: process.env.PLATFORM_TARGET || "",
    NEXT_PUBLIC_STATIC_LOCALE: process.env.NEXT_PUBLIC_STATIC_LOCALE || ""
  },
  skipTrailingSlashRedirect: isStaticExport,
  trailingSlash: isStaticExport,
  typedRoutes: false,
  output: isStaticExport ? "export" : undefined,
  experimental: {
    optimizePackageImports: ["lucide-react"]
  },
  images: isStaticExport
    ? {
      unoptimized: true
    }
    : undefined
};

if (!isStaticExport) {
  nextConfig.rewrites = async () => {
    const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.trim() || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`
      }
    ];
  };

  nextConfig.headers = async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        {
          key: "Content-Security-Policy",
          value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; ${connectSrc}; frame-ancestors 'none'; base-uri 'self'`
        },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        { key: "X-DNS-Prefetch-Control", value: "off" },
        { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        { key: "Origin-Agent-Cluster", value: "?1" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }
      ]
    }
  ];
}

const withNextIntl = createNextIntlPlugin();

module.exports = withNextIntl(nextConfig);