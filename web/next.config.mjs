import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix opentimestamps bitcore-lib multiple instance error
    // Force all bitcore-lib imports to use the same instance
    config.resolve.alias = {
      ...config.resolve.alias,
      'bitcore-lib': resolve(__dirname, 'node_modules/bitcore-lib'),
    }

    // @aramantos/crypto WASM doesn't work with Next.js 14 webpack:
    // - Server: WASM file not available during page data collection
    // - Client: asyncWebAssembly makes modules async, breaking React component loading
    // JS shim implements the identical canonical hash algorithm.
    // CLI uses the real WASM package directly (no webpack).
    config.resolve.alias['@aramantos/crypto'] = resolve(__dirname, 'lib/crypto-shim.ts')

    return config
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      [
        "connect-src 'self'",
        'https://api.stripe.com',
        'https://kxhesmrmfawujrwrrres.supabase.co',
        'https://hphssodcgigaqwfpudjv.supabase.co',
        'https://core-api-852262347358.us-central1.run.app',
        'https://www.googleapis.com',
        'https://sheets.googleapis.com',
        'wss://kxhesmrmfawujrwrrres.supabase.co',
        'wss://hphssodcgigaqwfpudjv.supabase.co',
      ].join(' '),
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig
