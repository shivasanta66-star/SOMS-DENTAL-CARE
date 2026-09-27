import type { NextConfig } from "next";

// The site and admin panel are exported as static files; every dynamic request
// (booking, payments, admin data) goes to the Netlify Functions in
// netlify/functions. Security headers live in netlify.toml.
const nextConfig: NextConfig = {
  output: "export",
  poweredByHeader: false,
};

export default nextConfig;
