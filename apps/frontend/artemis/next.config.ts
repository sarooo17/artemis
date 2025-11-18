import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Specifica esplicitamente la root del workspace per Turbopack
  turbopack: {
    root: path.resolve(__dirname, "../../../"),
  },
};

export default nextConfig;
