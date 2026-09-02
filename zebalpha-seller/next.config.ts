import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      canvg: false,
      html2canvas: false,
      dompurify: false,
    };
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(canvg|html2canvas|dompurify)$/,
      })
    );
    return config;
  },
};

export default nextConfig;
