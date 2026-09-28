import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Proxies auth/admin calls to the TM auth backend so the browser sees them
    // as same-origin requests — sidesteps the backend's CORS gap entirely for
    // local dev (see FRONTEND_INTEGRATION.md). Only active when AUTH_BACKEND_URL
    // is set; leave unset once the backend is deployed behind the same origin.
    const authBackend = process.env.AUTH_BACKEND_URL;
    if (!authBackend) return [];

    return [
      { source: "/api/auth/:path*", destination: `${authBackend}/api/auth/:path*` },
      { source: "/api/admin/:path*", destination: `${authBackend}/api/admin/:path*` },
    ];
  },
};

export default nextConfig;
