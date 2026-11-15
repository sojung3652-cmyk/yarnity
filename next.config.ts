import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The home folder above this repo has its own package-lock.json; pin the root to this project.
  turbopack: { root: __dirname },
};

export default nextConfig;
