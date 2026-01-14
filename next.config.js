/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable static export for Azure Static Web Apps
  output: 'export',
  trailingSlash: true,
  
  images: {
    domains: ['api.mapbox.com', 'tile.openstreetmap.org'],
    unoptimized: true, // Required for static export
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7071',
  },
}

module.exports = nextConfig
