import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/shared/lib/i18n.ts')

const nextConfig = async (phase: string, { defaultConfig }: { defaultConfig: NextConfig }) => {
  // Automatically alias Vercel Supabase Integration variables if set
  const detectedSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (detectedSupabaseUrl) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = detectedSupabaseUrl
  }
  const detectedAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY
  if (detectedAnonKey) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = detectedAnonKey
  }

  // Fail soft in lint/typecheck/test so `bun run typecheck` and `bun lint`
  // work without a full env; hard-fail only for real builds/serves when no URL is available.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const isBuildPhase =
      phase === 'phase-production-build' || phase === 'phase-production-server' || phase === 'phase-development-server'
    const message =
      '[next.config.ts] Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL\n' +
      'All /api/* proxy rewrites will point to "undefined/functions/v1/..." without it.\n' +
      'Add it to your .env.local (development) or connect the Supabase Integration in Vercel.\n' +
      'See .env.example for the full list of required variables.'
    if (isBuildPhase && !process.env.CI) {
      throw new Error(message)
    }
    console.warn(message)
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://placeholder.supabase.co'
  }

  const baseConfig: NextConfig = {
    ...defaultConfig,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: detectedSupabaseUrl || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: detectedAnonKey || '',
    },
    reactCompiler: true,
    // Self-contained production bundle for the container images, which boot it
    // with `bun server.js` (no Node.js in the runtime image at all).
    //
    // The Vercel exclusion that used to live here is gone. Vercel injects
    // its own deployment adapter via NEXT_ADAPTER_PATH, and Next 16.3 skipped
    // emitting `.next/next-server.js.nft.json` whenever an adapter was
    // configured while the standalone finalizer still read that file
    // unguarded -- a hard build failure on Vercel:
    //   ENOENT: no such file or directory, open '.../.next/next-server.js.nft.json'
    // That was fixed upstream in 16.4 (vercel/next.js#96646) and was never
    // backported to 16.3. On 16.4 the build succeeds with the standalone
    // output and VERCEL=1 set, so the conditional is no longer needed.
    output: 'standalone',
    // Pin the trace and bundler roots to the app directory. Next otherwise
    // infers the root by walking up for a lockfile, which mis-traces the
    // standalone bundle whenever an unrelated lockfile exists above the repo.
    outputFileTracingRoot: process.cwd(),
    turbopack: {
      root: process.cwd(),
    },
    // Next.js does not run the type check.
    //
    // Left on, it would run `typescript/lib/tsc.js` -- the JavaScript entry
    // point of the TypeScript 7 package -- which is a second compiler
    // disagreeing with the one this repository gates on. Two type checkers
    // in one build means two verdicts, and "the build passed" and "the gate
    // passed" can then mean different things.
    //
    // The build's type check is tsrs, run by `bun run build` straight after
    // `next build` finishes, and it runs *after* on purpose: the generated
    // route types (`.next/types/**`) only exist once the build has produced
    // them, and tsrs reads them, because the project's tsconfig includes
    // them. Run before the build, tsrs would check the source and nothing
    // else.
    //
    // Next's own documentation says this option is only safe when a type
    // check runs as part of the build or deploy process. It does: every
    // path that builds -- the gate, CI, Vercel, the container image -- goes
    // through `bun run build`.
    //
    // `bun run typecheck:tsc` still runs the beta compiler, as a cross-check
    // in CI. The two ship different `lib.dom.d.ts` files and each has caught
    // bugs the other missed, so the second opinion stays -- in the gate,
    // where a disagreement is a report rather than a build failure.
    typescript: {
      ignoreBuildErrors: true,
    },
    redirects: async () => [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ],
    rewrites: async () => {
      const targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
      if (!targetUrl || targetUrl.includes('placeholder')) {
        return []
      }
      return [
        {
          source: '/api/:path*',
          destination: `${targetUrl.replace(/\/+$/, '')}/functions/v1/api/:path*`,
        },
      ]
    },
    headers: async () => [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com https://*.sentry.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "media-src 'self' https: blob: data:",
              "connect-src 'self' https: wss:",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ],
    experimental: {
      serverActions: {
        bodySizeLimit: '10mb',
      },
      turbopackRustReactCompiler: true,
      useOffline: true,
    },
    images: {
      localPatterns: [{ pathname: '/api/**' }, { pathname: '/images/**' }],
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '*.supabase.co',
        },
      ],
      minimumCacheTTL: 14400,
    },
    logging: {
      fetches: {
        fullUrl: true,
      },
    },
  }
  return withNextIntl(baseConfig)
}

import { withSentryConfig } from '@sentry/nextjs/config'

export default withSentryConfig(nextConfig, {
  silent: true,
  org: 'organicnz',
  project: 'audiobookphile',
  // Widen source map upload scope for better stack traces on errors
  widenClientFileUpload: true,
  // Delete source maps after uploading to Sentry to prevent public access
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
