import type { NextConfig } from "next";

// عند البناء لنشر GitHub Pages (مستودع باسم uco-pickup) نحتاج بادئة مسار
// /uco-pickup، بينما التطوير المحلي يبقى على الجذر /
const isGithubPagesBuild = process.env.GITHUB_PAGES_BUILD === "true";
const basePath = isGithubPagesBuild ? "/uco-pickup" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
