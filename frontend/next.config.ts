import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages serves the site at /<repo-name>/ unless a custom domain is configured.
  // Set NEXT_BASE_PATH="" in the workflow to disable when using a custom domain.
  basePath: process.env.NEXT_BASE_PATH ?? "/TrustLedger",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
