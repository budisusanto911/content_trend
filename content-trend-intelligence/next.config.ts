import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'mensurable-destroyable-dorie.ngrok-free.dev',
    '*.ngrok-free.dev',
    'localhost:3000',
  ],
};

export default nextConfig;
