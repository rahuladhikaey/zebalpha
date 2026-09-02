/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config, { webpack }) {
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
    config.module.rules.push({
      test: /\.svg$/i,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

export default nextConfig;

