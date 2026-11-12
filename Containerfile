# Containerfile for Podman
#
# The container runtime here is Podman, not Docker. Podman looks for a
# `Containerfile` first and only falls back to `Dockerfile`, so this file
# and `Containerfile.local` are the only two build recipes in the repository.
# The Docker-named duplicates were removed: they were byte-for-byte copies of
# these, and a pair of build recipes that can drift is one more thing to keep
# in sync for no benefit.
#
# The image contains Bun and nothing else: no Node.js runtime, no npm, no
# package-manager shims. The application is built and served by Bun.
#
# The runtime is the Bun canary channel, because the toolchain this project
# uses -- `bun lint` and `bun fmt` -- ships only in canary builds. The
# current canary-alpine digest is
# sha256:d02313fe6ac10f79d4077863b29c26a0ffd37aae0529e111a666330e6b7854ba;
# pin it if the channel is not wanted.

### STAGE 0: Install dependencies ###
FROM oven/bun:canary-alpine AS deps

WORKDIR /app

# Copy lockfile and manifests
COPY package.json bun.lock bunfig.toml ./

# Two files have to be here before the install, not after it.
#
# `scripts/security-scanner.ts` is the scanner bunfig.toml configures, and
# `bun install` refuses to run at all when a configured scanner is missing.
#
# `scripts/prepare.ts` is the project's own `prepare` lifecycle hook, which
# `bun install` runs when the install finishes. Without it, the hook cannot
# be found and the install fails.
#
# Both are self-contained -- no imports, no build step -- so copying the two
# files is enough to make this stage work.
COPY scripts/security-scanner.ts scripts/prepare.ts ./scripts/

# The Bun package cache lives in a mounted volume so it survives between
# builds. A cold cache re-downloads every tarball; a warm one makes the
# dependency layer effectively instant.
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

### STAGE 1: Build ###
FROM oven/bun:canary-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry for privacy
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time public env vars (passed via --build-arg in CI)
# These are baked into the build at image creation time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN bun run build

# `bun run build` is the build *and* the type check: the script runs
# `bun run typecheck` after `next build` finishes, so the image is never
# built from a tree that does not typecheck. The compiler is tsrs, the Rust
# port of the TypeScript 7 compiler, and the Alpine image gets
# `@tsrs/linux-arm64-musl` from the same lockfile -- a statically linked
# ELF with no libc dependency, so it runs on musl exactly as it runs on
# glibc and on macOS.

### STAGE 2: Runtime ###
# Bun only — the image ships no Node.js runtime.
FROM oven/bun:canary-alpine AS runner

WORKDIR /app

# Production environment configuration
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security (Podman best practice)
# Podman runs rootless by default, but we add an extra layer of isolation
RUN addgroup --system --gid 1001 bun \
 && adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public

# Copy standalone server and static files
COPY --from=builder --chown=nextjs:bun /app/.next/standalone ./
COPY --from=builder --chown=nextjs:bun /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment for the server
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check - critical for Podman/Kubernetes deployments
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Start the application with Bun's runtime
CMD ["bun", "server.js"]
