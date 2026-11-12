# Deployment Operations Guide

This document covers the environment variables required to deploy `audiobookphile-web` on Vercel, explains naming quirks, and provides troubleshooting steps for common deployment failures.

---

## 0. Vercel Template Deployment & Automatic Supabase Mapping

Audiobookphile supports 1-click template deployment via the Vercel Marketplace Supabase Integration (`integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6`).

When deploying via the template clone flow:
1. Vercel prompts the deployer to link or create a new Supabase project.
2. The integration automatically injects:
   - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`
   - Database connection strings (`POSTGRES_URL`)
3. The centralized resolver in `src/shared/utils/supabase/env.ts` automatically detects and maps these variables without requiring any manual variable renaming.
4. **First-Time Setup Wizard (`/setup`)**:
   - When visiting an uninitialized instance or before any administrator accounts exist, navigate to `/setup`.
   - The setup diagnostic endpoint (`/api/setup/status`) verifies Supabase connectivity, table initialization, storage buckets (`covers`, `audio-files`, `backups`), and Edge API health.
   - If tables are uninitialized, a 1-click link to the Supabase SQL editor is displayed (`https://supabase.com/dashboard/project/<ref>/sql/new`) to run `supabase/schema.sql`.
   - The wizard allows creating the root administrator account directly. The database's `handle_new_user()` trigger automatically awards the `root` role to the first registered user (`user_type = 'root'`), ensuring zero-friction onboarding for template deployers.
5. **Automated CI/CD**:
   - To automate database schema migrations and Edge API deployment via GitHub Actions, configure `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` in your repository secrets.
   - The included `.github/workflows/deploy-supabase.yml` workflow automatically runs `bun run db:push` and `bun run functions:deploy`.

---

## 1. Environment Variable Reference

Variables are grouped by the Vercel environment in which they are required. "Build-time" variables (prefixed `NEXT_PUBLIC_`) are inlined into the browser bundle at compile time and must be present in every environment that triggers a build.

### Build-time variables

| Variable | Production | Preview | Development | Purpose | Consequence if absent |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Required | Required | Supabase project URL (e.g. `https://xyz.supabase.co`). Also used in `next.config.ts` to build the `/api/*` rewrite destination. | All Supabase client calls fail. The `/api/*` rewrites resolve to `undefined/functions/v1/api/*`, breaking every API route with 502/404 errors. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required | Required | Required | Public anonymous key for the Supabase browser client. Safe to expose to the browser. | The Supabase client cannot initialise; all auth and database queries fail. |
| `NEXT_PUBLIC_SITE_URL` | Required | Required | Required | Canonical public URL of the deployment — no trailing slash (e.g. `https://audiobookphile.com`). Used for OAuth redirect URLs and auth email links. | Auth callbacks and email confirmation/magic-link/password-reset links redirect to the wrong origin, breaking sign-in and sign-up flows. Falls back to `NEXT_PUBLIC_VERCEL_URL` / `VERCEL_URL`, which produces mismatched redirect URLs on Preview deployments. |
| `NEXT_PUBLIC_POSTHOG_KEY` | Required | Optional | Optional | PostHog analytics project API key (format: `phc_...`). | PostHog initialises with the placeholder value `phc_placeholder` so the app does not crash, but no real analytics events are captured. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Required if PostHog key is set | Optional | Optional | PostHog ingestion host. Defaults to `https://us.i.posthog.com` when absent. Change this if you use a custom PostHog domain or the EU cloud region. | Analytics events are sent to the default US PostHog endpoint, which may be incorrect for custom or EU-region setups. |

### Server-side variables

| Variable | Production | Preview | Development | Purpose | Consequence if absent |
| --- | --- | --- | --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Required | Required | Required for admin operations | Canonical service role key for server-side Supabase admin operations. Bypasses Row Level Security entirely. See [§2](#2-supabase_service_role_key-vs-supabase_service_key) for the alias. | `createServiceRoleClient()` throws `Missing environment variable: SUPABASE_SERVICE_ROLE_KEY` and all server-side admin operations fail with a 500 error. |
| `SUPABASE_SERVICE_KEY` | — | — | — | Legacy alias for `SUPABASE_SERVICE_ROLE_KEY`. Accepted as a fallback during a rename transition. Prefer the canonical name for all new configurations. | If this is the only name set, the fallback in `service-role.ts` keeps things working, but any future removal of that fallback would silently break the app. |

### Storage — Backblaze B2 (optional group)

All five variables below are optional as a group. When any of them is absent the storage sync code automatically falls back to Supabase storage without crashing (graceful degradation via optional chaining in `storageSync.ts`). Set them only in environments where B2 sync is intended.

| Variable | Environments | Purpose | Consequence if absent |
| --- | --- | --- | --- |
| `B2_ENDPOINT` | Prod / Preview / Dev — optional | S3-compatible endpoint for the B2 bucket (e.g. `https://s3.us-west-004.backblazeb2.com`). | Storage sync falls back to Supabase storage. |
| `B2_BUCKET_NAME` | Prod / Preview / Dev — optional | Name of the B2 bucket that holds audiobook files. | Storage sync falls back to Supabase storage. |
| `B2_KEY_ID` | Prod / Preview / Dev — optional | B2 key ID (analogous to `AWS_ACCESS_KEY_ID`). | Storage sync falls back to Supabase storage. |
| `B2_APP_KEY` | Prod / Preview / Dev — optional | B2 application key (analogous to `AWS_SECRET_ACCESS_KEY`). | Storage sync falls back to Supabase storage. |
| `B2_REGION` | Prod / Preview / Dev — optional | B2 region string used to construct the S3-compatible endpoint. Defaults to `us-west-004`. | The default region is used; change only if your bucket is in a different region. |
| `B2_TERTIARY_*` | Prod / Preview / Dev — optional | Same five variables prefixed `B2_TERTIARY_` (`B2_TERTIARY_ENDPOINT`, `B2_TERTIARY_BUCKET_NAME`, `B2_TERTIARY_KEY_ID`, `B2_TERTIARY_APP_KEY`, `B2_TERTIARY_REGION`) select the third B2 bucket (`audiobookphile-b2-tertiary`). Used by the backend edge functions, not the web server. | Edge functions fall back to the secondary / primary tier. |
| `ACTIVE_B2_TIER` | Supabase Edge Function secrets only | `tertiary` (current), `secondary`, or `primary` — which bucket new uploads are presigned into. | New uploads presign to `primary`. |

---

## 2. `SUPABASE_SERVICE_ROLE_KEY` vs `SUPABASE_SERVICE_KEY`

### Background

When this project was first configured in the Vercel dashboard the service role key was stored as `SUPABASE_SERVICE_KEY` — a shorter, informal name. The codebase has since standardised on the canonical Supabase name `SUPABASE_SERVICE_ROLE_KEY`. To avoid breaking existing deployments during the transition, `service-role.ts` accepts either name via a nullish-coalescing fallback:

```ts
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
```

Both variable names are therefore intentionally supported. For any new Vercel project or environment configuration, always use `SUPABASE_SERVICE_ROLE_KEY`.

### Migrating from `SUPABASE_SERVICE_KEY` to `SUPABASE_SERVICE_ROLE_KEY`

1. In the Vercel dashboard, open **Settings → Environment Variables** for the project.
2. Add a new variable named `SUPABASE_SERVICE_ROLE_KEY` with the same value as the existing `SUPABASE_SERVICE_KEY`. Apply it to all environments where the old variable was set (Production, Preview, and/or Development).
3. Trigger a new deployment (redeploy or push a commit) and verify that server-side admin operations — uploads, user management, etc. — still work correctly.
4. Once you have confirmed the app is healthy, you may optionally delete the old `SUPABASE_SERVICE_KEY` variable from the Vercel dashboard.

> **Security note:** The service role key bypasses Row Level Security entirely. Never prefix it with `NEXT_PUBLIC_`, never commit it to source control, and never expose it in client-side code.

---

## 3. `NEXT_PUBLIC_SITE_URL` and Supabase Auth

### Why this variable matters for auth

The auth callback route (`src/app/callback/route.ts`) uses the `x-forwarded-host` header as a fallback, which is sufficient to redirect the browser correctly after an OAuth code exchange on Vercel Preview deployments. However, Supabase Auth generates email confirmation links, magic links, and password-reset URLs **server-side**, using the "Site URL" configured in the Supabase Auth dashboard — not any value from the Next.js code. If `NEXT_PUBLIC_SITE_URL` in Vercel does not match the Supabase Auth "Site URL" setting, those server-generated links will point to the wrong domain and auth flows will break.

### Required configuration

#### In the Vercel dashboard

1. Open **Settings → Environment Variables**.
2. Set `NEXT_PUBLIC_SITE_URL` to the canonical URL for each environment:
   - **Production:** `https://audiobookphile.com` (or your production domain)
   - **Preview:** the Vercel Preview URL for the branch (e.g. `https://audiobookphile-web-git-my-branch-org.vercel.app`) — or use a wildcard approach as described below
   - **Development:** `http://localhost:3000`
3. Redeploy after making changes so the new value is inlined into the build.

#### In the Supabase Auth dashboard

1. Open the [Supabase dashboard](https://supabase.com/dashboard), select your project, then go to **Authentication → URL Configuration**.
2. Set **Site URL** to your production URL (e.g. `https://audiobookphile.com`). This value is used by Supabase when generating email confirmation and password-reset links.
3. Under **Redirect URLs**, add an entry for each URL pattern that Supabase Auth is permitted to redirect to after an OAuth flow. At minimum add:
   - `https://audiobookphile.com/**` — production
   - `https://audiobookphile-web-*.vercel.app/**` — wildcard pattern covering all Vercel Preview deployment URLs
   - `http://localhost:3000/**` — local development

> **Why the wildcard is needed:** Each Vercel Preview deployment gets a unique URL. Adding a wildcard pattern (e.g. `https://audiobookphile-web-*.vercel.app/**`) to the Supabase redirect allow list means you do not need to register each preview URL individually.

---

## 4. Runtime: Bun

This project runs on **Bun end to end**. Node.js is not installed, invoked, or required by any build, script, container image, or production function.

| Layer | Runtime | Where it is pinned |
| --- | --- | --- |
| Package manager | Bun canary | `.mise.toml` pins the canary channel; `packageManager` + `devEngines` in `package.json`; `bun.lock` is the only lockfile |
| Dev server / build | Bun | `bun --bun next dev` / `bun --bun next build` in `package.json` scripts |
| Linter / formatter | Bun canary | `bun lint` and `bun fmt`, configured in `bunfig.toml` |
| Type gate | tsrs (Rust port of tsc) | `tsrs@0.18.0-ts7.1.0-dev.20260929`; `bun run typecheck`; run by `scripts/tsrs.ts` |
| Build type check | tsrs (Rust port of tsc) | the same compiler, run by the `build` script after `next build`; `typescript.ignoreBuildErrors` in `next.config.ts` |
| Next.js's setup check | the `typescript` package | `typescript@7.1.0-beta`; required by `next build`, and never invoked as a compiler (§4.2.2) |
| Unit tests | Bun | `bun test` (`bun:test` imports) |
| Dependency audit | Bun | `bun run audit` → `bun audit --production` |
| Install-time scan | Bun | `scripts/security-scanner.ts`, configured in `bunfig.toml` under `[install.security]`; `bun run scan` |
| Bundle budget | Bun | `scripts/size-budget.ts`; the ceiling lives in `bunfig.toml` under `[size]` |
| Repository scripts | Bun | `scripts/*.ts`, each a Bun module with a `#!/usr/bin/env bun` shebang |
| Container images | Bun canary | `oven/bun:canary-alpine` in `Containerfile` and `Containerfile.local` |
| Vercel functions | Bun stable | `bunVersion: "1.4.x"` in `vercel.json` |

There is no ESLint, oxlint, Prettier, Biome or `tsc` invocation in the tree,
and no Node.js runtime anywhere: the linter, formatter, test runner and
auditor are Bun's own, the type gate is a native Rust binary, and the
compiler Next.js drives is TypeScript 7's native build.

### 4.0 The Node-free guarantee

"Node.js is not installed" is a statement about this machine, and it stops
being true the moment someone installs Node, or a CI runner image ships with
it, or a dependency's install script calls `node`. The guarantee that holds
everywhere is in `bunfig.toml`:

```toml
[run]
bun = true
```

With that set, Bun prepends a `node` symlink pointing at the bun binary to
`$PATH` for every script and executable it launches. A script that runs
`node` runs Bun instead. A `#!/usr/bin/env node` shebang is executed by Bun.
A dependency's `postinstall` that calls `node ./install.js` — `@sentry/cli`,
`@swc/core` and `@vgpu/adapter-node` all do — runs under Bun. It is
recursive, so a script that shells out to another script that calls `node`
still lands on Bun.

Bun enables this by default when `node` is not already in `$PATH`, which is
the case on a clean machine. "By default" is not a guarantee: a developer
with Node installed would silently get a different toolchain from the one CI
runs, and the difference would only show up as a difference. Pinning it
means every machine behaves the same way.

`[run] noOrphans = true` sits next to it. Bun watches the process that
spawned it and exits when that parent goes away, even if the parent was
force-killed, and it terminates its own descendants on the way out. The case
this repository hits is a cancelled pre-push gate leaving a `next dev` server
holding port 3000 and a couple of gigabytes of RAM, so that the next run
fails to bind the port and the failure reads as a product bug.

Two packages ship a `#!/usr/bin/env node` wrapper that the repository used
to go through. Each is now launched by a Bun-native script that resolves the
platform binary and `process.execve`s it, with no Node API in the path:

| Wrapper | Replaced by | What the wrapper did |
| --- | --- | --- |
| `tsrs/bin/tsrs` | `scripts/tsrs.ts` | resolved `@tsrs/<platform>`, re-exec'd it |
| `supabase/dist/supabase.js` | `scripts/supabase.ts` | resolved `@supabase/cli-<platform>`, spawned it |

`typescript/bin/tsc` was a third of them, and `scripts/tsc.ts` replaced it
the same way, until the TypeScript 7.1 beta compiler left the repository
entirely. tsrs is the only compiler now, so there is no third wrapper to
bypass.

All of them are the same shape: `Bun.resolveSync` instead of
`module.createRequire`, `Bun.file` and `Bun.spawnSync` instead of `node:fs`
and `node:child_process`, and `process.execve` so the native binary inherits
the terminal directly — no signal forwarding, no extra process, and the exit
code is the compiler's own.

Two Node-authored tools remain, and both run under Bun: **Lighthouse CI**
(`@lhci/cli`) and **Playwright** (`@playwright/test`). Neither has a Bun
equivalent, and both are the reason a JavaScript runtime has to be present at
all. They are called through `bun run lhci` and `bun run --bun playwright
test`, so the runtime that executes them is Bun.

`@types/node` is present, and it is worth being precise about why. Next.js
requires it — `next/dist/lib/verify-typescript-setup.js` lists
`@types/node` among the packages it resolves before it will type check — and
`bun-types` carries a `/// <reference types="node" />` of its own. Neither is
removable. What is removable is the *use* of Node's API, and the repository
enforces that in two places.

`scripts/node-api.ts` holds the rules, in one place. `import/no-nodejs-modules`
in `bunfig.toml` covers the import boundary, and the rules cover what a
module can reach for without importing anything: `Buffer`, `__dirname`,
`__filename`, `require()`, `module.exports`, `process.binding()` and
`exports.*`.

Two gates apply them. The pre-commit gate applies them to the files in a
commit, which is the ordinary path. `scripts/node-api-scan.ts` applies them
to **every source file in the tree**, every time — because a guard that only
sees new files cannot tell you that the repository is already violating a
rule it now enforces. A merge that brings in a file written on another
branch, a commit made with `--no-verify`, and a rule that was tightened
after the tree was already committed are all paths the staged-file guard
does not cover.

Node's *type declarations* are in scope; Node's *runtime* is nowhere near
the tree.

### 4.1 Why the canary

Bun's `bun lint` and `bun fmt` — a native linter and formatter that replace
oxlint, ESLint, Prettier and Biome outright, and remove two more config files
— are **not in any released Bun**. They exist only in canary builds, and a
repository whose quality gate depends on an unreleased runtime cannot be
installed, built or gated on a stable Bun.

So the rule is: the whole toolchain moves to the canary at once, rather than
half of it running on a runtime the other half does not exist in.

The canary is pinned in `.mise.toml`:

```toml
[tools]
"github:oven-sh/bun" = "canary"
```

The generic GitHub backend is used rather than mise's `bun` core backend
because the canary is published under the rolling `canary` release tag and
has no `bun-v<version>` tag of its own. `mise install` re-resolves the
channel, so a newer canary is picked up on demand.

`bun run lint` and `bun run format` run `scripts/require-canary.ts` first.
It probes the runtime for `bun lint` and `bun fmt` rather than comparing
version strings — a canary reports itself as the next development version
(1.4.4 today), so a version check would be wrong on the day that version
ships and wrong for every canary built in between.

**Vercel stays on stable Bun.** The Vercel build runs `bun install` and
`bun run build`; it never runs the linter or the formatter, so it has no
reason to take a canary. `vercel.json` pins `bunVersion: "1.4.x"`.

### 4.2 One compiler, two builds

tsrs is the type checker. It is the only one in this repository, and it
runs in every place a type check can happen: the pre-commit hook, the
pre-push gate, CI, the editor's language server and the build.

| | tsrs | tsrs, WebAssembly |
| --- | --- | --- |
| Role | The type checker | The type checker, where there is no native binary |
| npm | `tsrs@0.18.0-ts7.1.0-dev.20260929` | `@tsrs/wasm@0.18.0-ts7.1.0-dev.20260929` |
| Wall clock | 0.42 s for the whole project | 10.3 s |
| Peak memory | 188 MB | 332 MB |

The WebAssembly column is the same compiler as the one beside it, not a
different one; §4.2.3 is about how that is arranged. The memory figures are
the peak resident set of the whole run, Bun included, measured on this
project — 69% less than the TypeScript 7.1 beta compiler that used to sit
beside it, and about the "~70% less memory" Cloudflare reports for tsrs
against TypeScript 7.0.

**One compiler means one verdict.** Every gate, and the build, run tsrs, so
"the build passed" and "the gate passed" cannot mean different things. The
TypeScript 7.1 beta compiler used to be a second verdict in the build, and
removing it is what made that true. Bun's own checker went the same way:
there is no `bun check` in this repository, because a second type checker is
a second verdict waiting for the day the two disagree.

**What the second opinion is not.** tsrs ships its own `lib.*.d.ts` files,
and those lag: tsrs's `lib.dom.d.ts` declares `crossOrigin: string | null`
where the strict DOM lib has `"anonymous" | "use-credentials" | null`. That
difference is not academic — the strict version caught a real bug in this
codebase (`img.crossOrigin = 'Anonymous'`, an invalid value that silently
leaves the image untainted and the canvas unreadable).

With the TypeScript 7.1 beta compiler gone, that gap is covered by the
repository's own lint rule instead: `audiobookphile/dom-enum-values`, in
`scripts/lint-plugin.ts`, which `bun lint` loads from `bunfig.toml`. It
reports a DOM property whose value is not one of the ones the HTML spec
defines. React's own types already cover the JSX form; the rule covers the
property assignment, which is where the bug was.

The rule is narrow on purpose. `method`, `kind` and `loading` are DOM
properties *and* ordinary words, and a rule that fires on
`options.method = 'CUSTOM'` is a rule that gets switched off — and a rule
that is switched off protects nothing. The names it does cover are DOM-only,
so a property with one of them is a DOM property.

**The second opinion is `bun lint`.** Its type-aware rules need types, so
Bun's own analysis runs over the whole project as part of the lint step —
which is already in every gate. That is where a second implementation of
the type system earns its keep: not as a second verdict, but as the source
of the rules that find what tsrs's types cannot express.

### 4.2.1 The build's type check is tsrs, and it runs last

Next.js can type check during `next build`, and it used to: it ran
`typescript/lib/tsc.js` — the JavaScript entry point of the TypeScript 7
package, which is no longer installed here. That was a second compiler,
disagreeing with the one this repository gates on, and a build with two
type checkers has two verdicts: "the build passed" and "the gate passed"
can mean different things.

So `next.config.ts` sets `typescript.ignoreBuildErrors: true` and the
build script runs the type check itself:

```
"build": "rm -rf .next && bun --bun next build && bun run typecheck"
```

Next's documentation says that option is only safe when a type check runs
as part of the build or the deploy process. It does — every path that
builds goes through `bun run build`: the gate, CI, Vercel and the
container image.

**The type check runs after the build on purpose.** The generated route
types — `.next/types/routes.d.ts`, `root-params.d.ts` and the rest — only
exist once the build has produced them, and the project's `tsconfig.json`
includes them. A type check that ran before the build would see the source
and nothing else; one that runs after it sees the routes as Next generated
them, which is exactly what the check Next used to run covered. It is
verified, not assumed: a deliberate type error in `.next/types/` is
reported as `TS2322` by the same command that gates every build.

The build still ends up failing on a type error — with a non-zero exit
code, from the tsrs step rather than from Next's — so nothing depends on
the build's own type check to be sound. It is one compiler, one verdict,
and it is the compiler the gate trusts.

The container image is no exception: `@tsrs/linux-arm64-musl` is in the
lockfile, and the binary is a statically linked `ELF 64-bit LSB
executable, ARM aarch64` with no libc dependency at all, so it runs on
Alpine exactly as it runs on macOS and on glibc Linux.

### 4.2.2 The `typescript` package, and why it is still here

tsrs is the only compiler that runs in this repository. The `typescript`
package is still installed, and it is not a compiler here — it is a
*requirement*.

`next build` verifies the TypeScript setup before it does anything else.
`experimental.useTypeScriptCli` is on by default, so the verification
resolves the `tsc` binary inside the package, and the tsconfig defaults are
written from its version. Without the package, the build fails — and it
fails by *installing* one for you, which is a surprising thing to discover
halfway through a production build, and which rewrites the lockfile while
it does it.

The checker in that package is never invoked. `typescript.ignoreBuildErrors`
is set, so `shouldRunTypeCheck` is false and Next skips the check
completely; the type check is tsrs's, run by the build script afterwards.
The package is a library Next.js reads, and nothing more.

The version is pinned exactly, for a reason that is not obvious: the
verification resolves a specific file inside the package — `lib/tsc.js` for
the CLI mode — and the latest stable does not have it. `typescript@7.0.2`
resolves to a package the check rejects, and the build fails with a message
about a package that is, visibly, installed.

### 4.2.3 tsrs runs everywhere, as tsrs

tsrs publishes a native binary for five platforms: `darwin-arm64`, and
`linux-x64` and `linux-arm64` against glibc and musl. There is no Windows
build and no Intel Mac build.

That matters here because the build's type check is tsrs. Before this
change the build type checked with the TypeScript 7.1 beta compiler, which
Next.js drove and which publishes twenty-one platform packages — so the
build worked on Windows and on an Intel Mac. Making tsrs the build's type
checker without closing that gap would have been a regression in exactly
the direction the toolchain was supposed to be moving.

The gap is closed with the same compiler, not with another one. tsrs also
publishes a WebAssembly build, `@tsrs/wasm`, at the same version and
published at the same moment: the package version follows tsrs and names
the TypeScript version it ports, so the two are the same checker, the same
standard libraries and the same diagnostics — one compiled to a native
binary and one to WebAssembly. `scripts/tsrs.ts` uses the native binary
when the platform has one and falls back to the WebAssembly build when it
does not, and the fallback is the *same compiler*, not a second opinion.

That is checked rather than assumed. With a deliberate type error in the
tree, the two builds produce byte-identical diagnostics and the same exit
code:

```
src/shared/lib/i18n.ts(46,7): error TS2322: Type 'string' is not assignable to type 'number'.
src/shared/lib/i18n.ts(47,14): error TS2322: Type 'number' is not assignable to type 'string'.
```

What the fallback costs, measured on this project:

| | Wall clock | Peak memory | Notes |
| --- | --- | --- | --- |
| Native tsrs | 0.42 s | 188 MB | the default; the process is replaced by the binary |
| WebAssembly tsrs | 10.3 s | 332 MB | in-process under Bun; 271 MB of wasm memory |

The TypeScript 7.1 beta compiler that used to sit beside them took 0.76 s
and 597 MB, which is where the "~70% less memory" figure comes from.

The WebAssembly build does not implement `--lsp` or `--watch`, so the
launcher refuses them with the reason rather than failing somewhere
deeper. The editor's language server needs the native binary; the type
check does not.

`TSRS_FORCE_WASM=1` takes the WebAssembly build on a platform that has the
native one, which is how the fallback is tested here and how the two can be
compared on the same tree.

### 4.2.4 tsrs in the editor

**The gate is tsrs, and it is tsrs in the gates.** The pre-commit and
pre-push scripts both run `bun run scripts/tsrs.ts --noEmit`. They used to
run `bun check`, which contradicted this section and left tsrs in no gate at
all.

**Why `scripts/tsrs.ts` exists.** The `tsrs` npm package ships a JavaScript
launcher (`bin/tsrs`) whose shebang is `#!/usr/bin/env node`. It resolves the
platform binary and re-execs it, which works under Bun — Bun implements
`process.execve` — but it puts a Node-targeted script in the path of the type
gate, and it reaches for `node:child_process` and `node:fs` to do work Bun
can do natively. `scripts/tsrs.ts` does the same job with no Node API in it:
`Bun.resolveSync` to find `@tsrs/<platform>`, `Bun.file` and
`Bun.spawnSync` to detect musl the way upstream does, and `process.execve`
to replace itself with the native binary. The result is the same behaviour
with one fewer runtime in the chain, and it is the same entry point the
editor's language server uses.

**Why `scripts/tsc.ts` existed.** The TypeScript 7 package had the same
shape of problem: `typescript/bin/tsc` is a `#!/usr/bin/env node` wrapper
that resolves `@typescript/typescript-<os>-<arch>` and re-execs it, reaching
for `node:fs`, `node:child_process`, `node:module` and `node:url` on the
way. `scripts/tsc.ts` resolved the platform package with `Bun.resolveSync`
and `process.execve`d the native binary directly. It is shorter than the
tsrs launcher for one reason: the TypeScript platform packages are Go
binaries, statically linked, so there is no libc to detect and no musl
probe.

The file is gone, and so is the package. tsrs is the only compiler in this
repository now, and the second opinion is Bun's own checker — which is
built into the runtime, so it needs no launcher at all. The gap the beta
compiler's stricter DOM lib used to cover is covered by the repository's
own lint rule; §4.2 has the details.

tsrs ships a language server. It speaks the same protocol as `tsgo --lsp`,
and it is fast: a one-file edit rechecks in about 50 ms, against 0.5-20 s
for the Go compiler, using 1.5-2.7 GB of memory against 10-15 GB.

`docs/neovim-lsp.lua` is the configuration for it, for Neovim 0.11 and
newer, whose LSP client is built in and needs no plugin. It points at
`scripts/tsrs.ts`, so the editor spawns the Rust binary directly.

The protocol has been exercised end to end: `initialize`, capability
registration, `textDocument/didOpen` and a pull `textDocument/diagnostic`
all round-trip, and the diagnostic that comes back for a deliberate type
error is the expected TS2322.

### 4.3 Vercel: the Bun runtime

`vercel.json` sets `bunVersion`, which makes Vercel run the Next.js functions on Bun instead of Node.js. Vercel manages the patch version; `1.4.x` is the Bun 1.4 line (the Zig→Rust rewrite), and `"1.x"` would pin the previous 1.3 series.

Two things make this work:

- The `dev` and `build` scripts run the Next.js CLI under Bun (`bun --bun next ...`). Vercel requires this for Next.js on the Bun runtime, and it also makes local builds match production.
- `bun.lock` makes Vercel install with Bun.

**The one place Node.js still exists is inside the framework.** Next.js 16's `src/proxy.ts` (the routing layer that refreshes the Supabase session) is Node-runtime-only by design — the `runtime` option is not available in Proxy files and setting it throws. Vercel runs that layer on Node regardless of `bunVersion`. This is framework behaviour, not a leftover in this repository, and it cannot be removed from the app side.

**Rollback:** if the Bun runtime misbehaves in production, delete the `bunVersion` key from `vercel.json` and redeploy. That is the only change needed — no code rollback, no rebuild of the image, and no change to the build scripts (the `bun --bun next ...` commands are valid on either runtime).

### 4.4 Containers: standalone output under Bun

The images build with `output: 'standalone'` and start with `CMD ["bun", "server.js"]`, so the runtime image contains Bun and nothing else.

`output` is set unconditionally in `next.config.ts`:

```ts
output: 'standalone'
```

It used to be conditional on `process.env.VERCEL`. Vercel injects its own
deployment adapter via `NEXT_ADAPTER_PATH`, and Next 16.3 skipped emitting
`.next/next-server.js.nft.json` whenever an adapter was configured while the
standalone finalizer still read that file unguarded — a hard build failure on
Vercel (`ENOENT: ... .next/next-server.js.nft.json`). That was fixed upstream
in 16.4 (vercel/next.js#96646) and never backported to 16.3. On 16.4 the
build succeeds with `VERCEL=1` set and the standalone output requested, so
the conditional is gone.

The images are built from `oven/bun:canary-alpine`, matching the toolchain
pin. The current digest is
`sha256:d02313fe6ac10f79d4077863b29c26a0ffd37aae0529e111a666330e6b7854ba`; pin
it if the channel is not wanted.

Vercel injects its own deployment adapter, and Next 16.3 skips emitting `.next/next-server.js.nft.json` whenever an adapter is configured while the standalone finalizer still reads that file unguarded. The combination is a hard build failure on Vercel (`ENOENT ... .next/next-server.js.nft.json`). Vercel ignores the standalone directory anyway, so the clean fix is to not request it there. Upstream: [vercel/next.js#96646](https://github.com/vercel/next.js/issues/96646) — fixed in 16.4, never backported to 16.3.

#### 4.4.1 The build context is a trust boundary

The builder stage does `COPY . .`, so every file not excluded by
`.dockerignore` becomes an image layer — and image layers stay readable to
anyone who can pull the image, including from the registry's layer cache.

`.env.local` holds the Supabase service-role key, so `.dockerignore` excludes
every `.env*` file, along with the test artifacts, the build output and the
local probe scripts. The public variables reach the build the supported way,
as build arguments:

```bash
podman build -f Containerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -t audiobookphile .
```

The service-role key is never a build argument. It is a runtime secret, and
`compose.yaml` passes it in through `env_file` instead.

`scripts/` is deliberately *not* excluded: `package.json`'s `prepare` lifecycle
hook runs `scripts/prepare.ts` on every `bun install`, including the one in
the image's dependency stage. It contains no secrets, and the runtime stage
copies neither it nor the builder layer.

#### 4.4.2 One Node-shaped dependency in the runtime image

`jsdom` accounts for 8.3 MB of the 72 MB standalone output. It is not Next.js's
— it is pulled in by `isomorphic-dompurify`, which needs a DOM on the server
because the episode-description HTML is sanitized during SSR.

Replacing it with the browser-native `dompurify` would be smaller but **wrong**:
without a `window`, `dompurify` silently returns its input unsanitized, which
turns an SSR-rendered page into an XSS vector. The correct way to drop the
8.3 MB is to sanitize on the client and render nothing server-side, which is a
behaviour change (the description appears after hydration) and not a
dependency change.

### 4.5 The publish-age guard, and what it silently skips

`bunfig.toml` refuses package versions published in the last three days. A
compromised publish is the classic supply-chain attack, and this is the
cheapest mitigation available: a malicious version cannot be installed the
same day it is pushed, which is the window an attack actually uses.

The guard has a sharp edge worth knowing about: **Bun skips a blocked
optional dependency silently.** Nothing in the install output says so. The
package is simply absent, and the failure surfaces somewhere else entirely.

That is how the Next.js build came to depend on npm. `@next/swc-*` — the
per-platform native compilers Next loads at build time — are published in
lockstep with `next` itself, so on any day the canary channel moves, they
are inside the age window. Bun skipped them. The next build then found the
compiler missing and tried to fetch it by running `npm config get registry`
— a Node.js runtime this repository does not have — and failed with
`npm: command not found`.

The fix is the `minimumReleaseAgeExcludes` list in `bunfig.toml`, which now
covers `next`, `@next/env`, `@next/playwright` and all eight `@next/swc-*`
packages, along with `tsrs`, `typescript` and `bun-types`. Every entry is a
package that is pinned to an exact version in `package.json` and whose
versions are immutable on npm, so the guard has nothing to protect there.

If a build ever fails with `npm: command not found`, check first whether a
platform package is missing from `node_modules` — that is what the age guard
looks like when it is not told about an exemption.

### 4.5.1 The install-time scanner

The publish-age guard answers "was this published recently?". The scanner
answers a different question: "is this version one we have decided is
unacceptable?".

Bun 1.4 can scan every package before it is installed and cancel the install
when the scan returns a fatal advisory. `bunfig.toml` configures it:

```toml
[install.security]
scanner = "./scripts/security-scanner.ts"
```

A local path rather than a package from the registry, so the policy is code
in this repository: reviewable in a pull request, versioned with the code it
protects, and adding no dependency of its own.

It enforces four rules.

**Security floors.** A table of packages and the version ranges that are
acceptable for them. The version in the tree has to satisfy one of the
ranges for its package, or the install is cancelled.

These floors are the same versions the `overrides` block in `package.json`
pins, and the two mechanisms defend the same ground from opposite sides: the
override forces the version, and the floor refuses to let the tree go back
below it. Dropping an override by accident, or a `bun update` resolving a
transitive dependency to an older version, is caught at install time rather
than discovered by the next audit.

The ranges are per release line, and that matters. `brace-expansion` has
three lines in the tree — 1.1.21, 2.1.7 and 5.0.12 — each with its own fix,
so a single floor of 5.0.12 would have flagged the two clean lines. And
`uuid@12` and `nanoid@4` are lines where **every published version is
affected**: a floor of "at least 11.1.1" would have waved `uuid@12.0.1`
through. The rule is "satisfy at least one of this package's ranges", so a
version on an unfixable line satisfies none of them and is refused.

Every floor was checked against the OSV database at the version the tree
actually resolves to, so every range is satisfied today. A floor that no
published version could satisfy would cancel every install, which is the
failure mode this file has to avoid.

**Known-malicious packages.** `flatmap-stream` is denied outright at any
version — it is the payload itself, and there is no clean release of it.
`event-stream@3.3.6`, the four compromised `node-ipc` versions
(9.1.6, 9.2.2, 9.2.3, 12.0.1) and the three compromised `ua-parser-js`
versions (0.7.29, 0.8.0, 1.0.0) are denied at exactly those versions. The
version lists are deliberately narrow: `event-stream@4` and `node-ipc@10`
were never compromised, and refusing them would be a false positive for a
policy that has nothing to protect there.

**Registry-only resolution.** A dependency resolved from git, GitHub, a
tarball URL or a local directory has no immutable version. Whoever controls
that source can change what "1.0.0" points to after it has been reviewed. A
package from the npm registry at a published version cannot be swapped,
because the version is immutable and the tarball is content-addressed. The
allow-list for deliberate exceptions is empty today.

**Known advisories, from OSV.** The first three rules are *policy* — they
encode what this repository has decided. This one is a *lookup*: the whole
tree is put to the OSV database in one request, and anything it knows about
that is not on the accepted list cancels the install.

The reason it belongs here and not in `bun audit` is the order of events.
`bun audit` runs *after* the install; by then the tarball has been unpacked
and its lifecycle script has already run. This runs *before*. A compromised
package's `postinstall` has already executed by the time an audit could
notice it, and this is the check that happens first.

The query is one request for the whole tree — `POST /v1/querybatch` takes up
to a thousand packages — which is about two seconds for the thousand this
repository resolves. The per-package form would be a thousand requests, and
that is the difference between a gate people leave on and a gate people
switch off.

It **fails open**: if the database cannot be reached, the install proceeds
and the scanner says so on stderr. A supply-chain gate that breaks every
install on a network blip gets switched off, and a gate that is switched
off is worth nothing.

The four advisories this repository has decided to live with are the same
four the `audit` script in `package.json` ignores, and all four are packages
with no patched release: `braces@3.0.3` is the newest version ever
published, `sprintf-js@1.0.3` has no fixed 1.x, and `extract-zip@2.0.1` has
no patched release. They are still reported on every install — a decision
somebody made should be visible, not silent.

`bun run scan` runs the same scanner over the whole lockfile with
`bun pm scan`. The difference in coverage is worth knowing: the install-time
scan sees the packages being installed *for this platform*, and `bun pm
scan` sees every package in the lockfile, including the ones a different
platform would install.

The scanner has its own tests, in `scripts/__tests__/security-scanner.test.ts`.
A policy engine that cancels every install on a false positive gets deleted,
and one that lets a bad version through gets trusted, so both directions are
tested: that the real resolved set passes, that a version below a floor
fails, that a version on an unfixable line fails, that a clean version of a
package with a malicious one passes, that a malformed package is ignored
rather than turned into an advisory, that an unaccepted advisory cancels the
install, that an accepted one does not, and that the database being
unreachable lets the install through.

Those tests stub the network. A test that depends on the state of a remote
database is not a test — and `proxy-addr@2.0.7` really does have an
advisory, so without the stub the counts came back wrong.

**One side effect worth knowing about.** Configuring a scanner turns Bun's
*runtime* auto-install off. `bun run some-file.ts` whose import cannot be
resolved used to fetch the missing package and carry on; it now stops with
`Cannot find package "x": auto-install is off because a security scanner is
configured. Run "bun install"`.

That is a good trade. Auto-install resolves a version from the registry and
executes a lifecycle script in the same breath, which is the behaviour a
supply-chain review would object to most, and the error message says exactly
what to do. `bun x <package>` is unaffected: it still installs, because
naming a package to run is an explicit request.

**The container images copy the scanner in before the install.** `bun
install` fails outright when a configured scanner is missing — the error is
`SecurityScannerNotInDependencies` — so the dependency stage of both
Containerfiles copies `scripts/security-scanner.ts` and `scripts/prepare.ts`
in before it runs. The second file is there for the same kind of reason:
`bun install` runs the project's own `prepare` hook when the install
finishes, and a hook that cannot be found fails the install.

### 4.6 Dependency audit

`bun run audit` audits the **production** tree — the packages that actually
ship — and ignores one advisory:

```
bun audit --production --ignore GHSA-vfj7-8cjw-p6xm
```

`GHSA-vfj7-8cjw-p6xm` is `braces@3.0.3`, and **3.0.3 is the latest version
of `braces` that has ever been published**; the advisory covers `<=3.0.3`, so
every version in existence is affected. There is nothing to upgrade to. It
arrives through `@ducanh2912/next-pwa > fast-glob > micromatch`, a
build-time glob matcher that never sees untrusted input.

`bun run audit:all` audits the whole tree, dev dependencies included. It
reports **four** advisories, and every one of them is a package with no
published fix:

| Package | Advisory | Why it cannot be fixed |
| --- | --- | --- |
| `braces@3.0.3` | `GHSA-vfj7-8cjw-p6xm` | 3.0.3 is the newest version ever published; the advisory covers `<=3.0.3` |
| `extract-zip@2.0.1` | `GHSA-jmr9-qjv8-65gv`, `GHSA-7pqw-9j4j-h8q3` | no patched release exists; arrives through `@lhci/cli > lighthouse > puppeteer-core` |
| `sprintf-js@1.0.3` | `GHSA-hp3w-g68c-fv3c` | the advisory covers `<=1.1.3` and 1.1.3 is the newest 1.x; arrives through `@lhci/cli > @lhci/utils > js-yaml` |

All four are named in the `--ignore` list of both audit scripts, so the
scripts report **zero** vulnerabilities and fail only when a *new* advisory
appears. That is the point of the baseline: a scan that is permanently red
is a scan nobody reads.

The tree used to report **twenty** advisories, one of them critical. The
difference is `size-limit` and the overrides in `package.json`.

**`size-limit` is gone.** It measured one number — the total compressed size
of the client chunks — and it needed a `puppeteer-core` and a `webpack` in
the dependency graph to do it. `scripts/size-budget.ts` does the same
measurement with `Bun.Glob` and `Bun.gzipSync` and nothing installed, and
the ceiling now lives in `bunfig.toml` under `[size]` next to the coverage
floor. The metric is the sum of the per-file gzip sizes at level 9: each
chunk is a separate HTTP response with its own `Content-Encoding`, so the
bytes on the wire are the sum of the individually compressed files.

gzip rather than brotli because Bun has no brotli API, and `node:zlib` — the
one route to it — is a Node builtin, which this repository does not use.

**The overrides** are in `package.json`. The ones that are not patch-level
bumps are safe here for a specific reason: every vulnerable package has
exactly one consumer in the tree, and all of them sit under `@lhci/cli`,
which is a development-only tool. There is no second consumer to break.

| Package | From | To | Why |
| --- | --- | --- | --- |
| `dompurify` | 3.4.14 | 3.4.17 | XSS in `IN_PLACE` mode; sanitises episode HTML during SSR |
| `undici` | 8.10.0 | 8.12.2 | Three high-severity DoS and TLS advisories |
| `lodash` | 4.17.23 | 4.18.1 | Code injection via `_.template`; reached through Slate |
| `follow-redirects` | 1.16.0 | 1.16.1 | Credential stripping bypass; reached through axios |
| `source-map-js` | 1.2.1 | 1.2.2 | Event-loop DoS; ships in the runtime image |
| `fast-uri` | 3.1.6 | 3.1.8 | Authority injection; reached through ajv |
| `brace-expansion` | 1.1.12 / 2.1.4 / 5.0.9 | 1.1.21 / 2.1.7 / 5.0.12 | Recursion and quadratic-time DoS, on three major lines |
| `serialize-javascript` | 6.0.2 | 7.1.2 | RCE via `RegExp.flags`; build-time only. This one crosses a major version, which is what `bun audit fix` proposes too |
| `proxy-addr` | 2.0.7 | 2.0.8 | **The only critical advisory in the tree** — IP spoofing via an IPv4-mapped IPv6 trust subnet, through `@lhci/cli > express` |
| `qs` | 6.15.3 | 6.16.0 | Two moderate advisories; the `~6.15.1` range in `express` does not allow the fix, the override does |
| `uuid` | 8.3.2 | 11.1.1 | Buffer bounds check in v3/v5/v6. A major bump, and it is safe: 11.1.1 still ships a CommonJS build, which is what `@lhci/cli` requires |
| `tmp` | 0.0.33 / 0.1.0 | 0.2.6 | Symlink write and path traversal; reached through `@lhci/cli > inquirer` |
| `ip-address` | 10.5.0 | 10.7.1 | Four SSRF and trust-boundary bypasses; reached through `proxy-agent` |
| `compression` | 1.8.1 | 1.8.2 | Memory leak on premature response close; used directly by `@lhci/cli` |
| `js-yaml` | 3.15.1 | 3.15.2 | Unbounded CPU use on empty merge sources; reached through `@lhci/utils` |
| `basic-ftp` | 5.3.1 | 6.2.1 | Quadratic-time CPU DoS in the Unix directory-listing parser. A major bump, reached through `proxy-agent > pac-proxy-agent > get-uri` |
| `@modelcontextprotocol/server` | 2.0.0 | 2.3.1 | Three advisories in the MCP SDK — HTTP message cross-talk, memory exhaustion during validation, and a bearer token accepted for another service. A minor bump within the same major, and it affects only `vgpu`'s CLI subcommand, which this application never invokes |

`bun run lhci healthcheck` and `bun run lhci collect --help` are run against
the tree after every override, because an override that breaks the tool it
was applied to is worse than the advisory it was meant to fix.

### 4.7 Local development

```bash
mise install         # installs the pinned Bun canary (see .mise.toml)
bun install
bun run dev          # Next.js dev server under Bun
bun run typecheck    # tsrs --noEmit
bun run typecheck:watch   # tsrs --watch: re-checks a changed file in ~50 ms
bun run test:unit    # bun test, in a random order
bun run lint         # bun lint
bun run format       # bun fmt + sorted translation catalogues
bun run build        # production build, emits .next/standalone
bun run size         # client bundle budget, against the build above
bun run audit        # production dependency advisories
bun run scan         # the install-time security scanner, over the whole lockfile
bun run lhci healthcheck  # Lighthouse CI, under Bun
bun run supabase -- db push  # the Supabase CLI, under Bun
bun run types:sync   # regenerate src/types/supabase.ts from the backend
```

`bun run test:unit` runs the test files in a different order every time.
Bun prints the seed it used, so a failure is reproducible exactly:
`bun test --seed=3594610933`. A suite that only passes in one order has
hidden coupling between its files, and a fixed order hides it.

**The end-to-end gate finds its own browser.** `scripts/e2e-library.ts`
downloads the Playwright browsers into `~/.cache/ms-playwright` rather than
Playwright's own default directory, because macOS periodically reaps
`~/Library/Caches` and it took the browser out from under a gate once. The
directory is durable; the default one is not.

That choice has a trap in it, and the script closes it. `PLAYWRIGHT_BROWSERS_PATH`
is set with a runtime write to `process.env`, and Bun's `spawn` gives a child
the environment the process *started* with — so an install that does not
pass `env` explicitly installs the browser to one place while the tests look
in another. The symptom is the worst kind: the install reports success, and
then every test in the run dies with `Executable doesn't exist`, which reads
like a broken test environment and says nothing about the cause.

So the gate now passes the environment to the install, copies the browser
from Playwright's default directory when the durable one is empty rather
than downloading 500 MB again, checks the install's exit code, and verifies
the browser is really there before the suite starts. A missing browser
costs a second to report, not eight minutes to diagnose.

**"Is the browser there?" means "is *this* revision there?"** The check
asks Playwright which directories it wants — `playwright install chromium
--dry-run` prints them — and requires every one of them to be present. A
cache holding only a stale revision satisfies the looser "is there any
chromium-something" check, the install is skipped, and every test in the
run dies with `Executable doesn't exist`, because the revision on disk is
not the revision the runner launches. The revision changes with every
Playwright upgrade, and Playwright is the only thing that knows it.

**The gate picks its own port, and never reuses a server it did not
start.** Playwright's `reuseExistingServer` is on by default, which is right
for a developer testing against a dev server they are already running, and
wrong for a gate. When something is already listening on the port,
Playwright skips starting a server altogether and points the specs at
whatever is there. When that something is a leftover from a previous run,
every test dies at the first `page.goto('/login')` with
`ERR_CONNECTION_REFUSED` — and the log shows no server output at all,
because no server was started. The failure reads like a product-wide
outage.

So the gate takes a free port from the operating system, tells Playwright
not to reuse one, and checks the port is free before the first attempt
rather than only before a retry. It never signals the process holding the
port: that pattern also matches a developer's own dev server, and a gate
must not take out unrelated local work.

#### 4.7.1 The time zone, and why the render log was full of warnings

next-intl needs a time zone. Without one it warns on the server on *every*
render that uses a translation, which is every page, and the warning is
next-intl saying that the server render and the browser render may
disagree — which React then reports as a hydration mismatch.

The application had three `NextIntlClientProvider` instances and none of
them passed one, so the warning was on every page of the app. The fix is
`src/shared/lib/timeZone.ts`, which holds the single fixed zone, and the
three providers pass it.

A fixed zone, and UTC specifically, because the zone has to be the same on
the server and in the browser or the two renders disagree. The server's own
zone is whatever the machine is set to and the browser's is wherever the
user is, so neither can be a default. UTC is also what the cron builder
already falls back to (`timeZone || 'UTC'`). Nothing the app renders
depends on the zone: the only next-intl formatter consumer formats a
relative time, which is zone-independent.

`src/__tests__/intl-provider.test.ts` guards it, statically: every
`NextIntlClientProvider` in the app must be given a time zone. The symptom
was a warning in a dev server log, and a log nobody reads is how it
survived.

#### 4.7.2 A seek needs media to seek within

`player-track.spec.ts` clicks three-quarters of the way along the track and
asserts the playhead moved. Setting `currentTime` on an audio element that
has not loaded is a no-op, so the playhead stays at zero — and the
assertion fails for a reason that has nothing to do with the track. The spec
now waits for the media first, for `readyState >= 2` (HAVE_CURRENT_DATA:
real bytes arrived and were parsed), which is the same precondition
`playback-progress.spec.ts` already used.

Waiting for the precondition is not weakening the assertion: the seek still
has to move the playhead, and the keyboard seek below it still has to work.
It only stops the spec from asking a question the browser cannot answer
yet.

**Every failing run reports the host's memory, swap and load.** The suite
is timing-sensitive — it waits for a real audio stream and a real session,
while running a browser and a dev server at once — and the three
repositories share one 16 GB machine. When another end-to-end suite is
running on the same host, a test that waits for the player to mount can
time out on a perfectly healthy build; the same specs pass in isolation.
The host state next to a red run turns "the product is broken" into "the
product is broken, or the box was too busy", which is the difference
between an hour of chasing a regression and a re-run.

**The host is watched *during* the run, not after it.** A snapshot taken
after a failure is taken after the dev server has died, and a dead process
has already given its memory back — so the snapshot says the host was fine
at exactly the moment it was not. The gate samples the host every five
seconds while the suite runs and reports the *worst* reading, together with
the high-water mark of the dev server's own resident memory. That is the
number the OOM killer had to fight.

**A dead dev server is retried whenever it died**, not only when every
failure was a refused connection. The old condition required all of them to
be, so a run where the server died and one test happened to fail for
another reason got no retry at all: the one unrelated failure cancelled the
recovery. The question is not "were all the failures the same" but "is the
server still there", and that is a question about the port.

#### 4.7.3 The dev server, and what makes it die

`next dev` under Bun is JavaScriptCore, so there is no V8-style heap ceiling
to cap it with. The dev server grows as it compiles, and on a host that is
already running another build it can be the largest process on the box —
which is exactly the process the OOM killer takes. The symptom is every
remaining test failing at `page.goto('/login')` with
`ERR_CONNECTION_REFUSED`, which reads like a product-wide outage and says
nothing about the cause.

That is why the gate starts its own dev server on a port it picked, refuses
to reuse one it did not start, and retries with a fresh server when the old
one dies. It never signals the process holding the port: that pattern also
matches a developer's own dev server, and a gate must not take out
unrelated local work.

### 4.8 The gates, and what each one covers

| Gate | Covers | Whole tree? |
| --- | --- | --- |
| `bun run scripts/host-pressure.ts` | memory, swap, load and disk, before anything expensive | — |
| `bun run typecheck` | tsrs, the Rust port of the TypeScript compiler | yes |
| `bun run lint` | `bun lint`, with the type-aware rules on | yes |
| `bun run scripts/lint-canary.ts` | proves the lint rules are actually applied | — |
| `bun run scripts/lint-debt.ts` | proves the deferred rules' debt is not growing | — |
| `bun test` | the unit suite, in a random order | yes |
| `bun run scripts/node-api-scan.ts` | the Node API rules | yes, 640+ files |
| `bun run audit` | the production dependency tree, against the advisory database | yes |
| `bun run scan` | the install-time security scanner, over the lockfile | yes |
| `bun run scripts/lifecycle-audit.ts` | the dependencies whose install scripts Bun blocked | yes |
| `bun run scripts/security-audit.ts` | secrets, dynamic evaluation, unsanitised HTML | yes |
| `bun run build` | the production build, and tsrs over the routes it generated | yes |
| `bun run size` | the client bundle budget — the total, and the initial payload | — |
| `bun run clean` | the build's output, before the e2e starts a dev server | — |
| `bun run scripts/e2e-library.ts` | the end-to-end suite | — |

The local gate runs tsrs and the build; CI runs tsrs and the build. There is
no second type checker to choose between: `bun lint`'s type-aware rules are
where a second implementation of the type system does its work, and the
build's type check is the same compiler the gate uses.

The two rules that were once staged-file-only are now whole-tree scans, and
both of them exist because of the same gap: a guard that only ever sees new
files cannot tell you that the repository is already violating a rule it
now enforces. The Node API rules moved to `scripts/node-api.ts` so the
pre-commit gate and the repo-wide scan enforce exactly the same thing, and
the security audit reads the whole tree rather than only `src/`.

The security audit hands over to the `audiobookphile` CLI when it is built,
which is the authority on these rules and already scans the whole
repository. The glob-based implementation is the fallback, and it is what
runs in CI, where the backend repository's CLI is not built.

#### 4.8.1 The disk is a dependency too

`scripts/host-pressure.ts` is the preflight the gate runs first. It checks
memory, swap and load, and now the free space on the volume holding the
repository.

The disk was the last one missing, and it is the one that fails most
confusingly. A build that starts on a full disk does not say "the disk is
full" — it says something about a file it could not write, and the error
arrives from Turbopack's cache. That is what happened here twice: a
`No space left on device (os error 28)` inside a dev server log, in a run
that otherwise passed, because the failure was in a non-fatal path.

The threshold is in **absolute gigabytes**, not a percentage: a build needs a
gigabyte or two whatever the volume is sized, and a 460 GB volume at 5% free
is 23 GB free, which is plenty. Failing on a percentage would refuse to
work on a big disk that has room. The check is against the volume holding
the repository, not the root volume — on macOS those are different
volumes, and the root is a system volume the build barely writes to.

`CI_MIN_FREE_DISK_GB` (5 by default) overrides the threshold, the same way
`CI_MIN_FREE_MEM_PCT` and `CI_MIN_FREE_SWAP_PCT` do.

**And the gate stops there.** The preflight says it is "refusing to start a
build that will be blamed on the product", so the gate has to actually
refuse: when the preflight fails, the run ends at that step.

It used to carry on, and the cost was not the minutes — it was that
everything after it ran slowly on a host that had no room for it, and the
results were noise dressed up as findings. A type check that took four
times as long, a build that ran out of swap, an end-to-end suite whose
failures were the host's and not the product's: all of them reported as
step failures, on a gate that had already said the host could not be
trusted. Stopping at the preflight turns "the gate failed in four places"
into "the gate did not run, and here is why".

#### 4.8.2 A lint gate that reports nothing is not a gate

`bun lint` is the gate, and it works by counting the errors it finds. That
makes it blind in one specific way: a configuration change that stops the
rules from running produces the same output as a codebase with nothing
wrong, and the gate passes.

That is not hypothetical. An `[[lint.overrides]]` block placed in the
*middle* of the `[lint.rules]` table — which is where it reads most
naturally, right after the rule it overrides — voids the entire lint
configuration in Bun 1.4.4-canary.1. The rules that follow it in the table
are parsed as belonging to the override rather than to `[lint.rules]`, and
the linter then reports **nothing at all**: 1356 problems became 0. The
pre-push gate still passed, because it looks for errors and there were
none.

The same two blocks at the *end* of the file work correctly, and a single
override naming one file changes only that file's rules. It is the
placement, not the feature — which is why `bunfig.toml` has no override
block and says so.

`scripts/lint-canary.ts` is the other half of the answer. It writes a file
with a deliberate violation of a rule the repository enables, lints it, and
requires the rule to fire. A configuration that stops reporting is then
loud, and says what to look at.

#### 4.8.3 The type-aware rules, and the ones still deferred

Bun's linter can run rules that need type information, and the repository
runs eleven of them as errors. Four more were landed while the numbers were
measured properly:

| Rule | Was | Now |
| --- | --- | --- |
| `no-useless-default-assignment` | 9 violations, 4 files | landed |
| `no-redundant-type-constituents` | 17 violations, 6 files | landed |
| `no-unnecessary-type-assertion` | 147 violations, 69 files | landed |
| `no-floating-promises` | 52 violations, 37 files | landed |
| `no-unsafe-*` | 738 violations | deferred |
| `require-await` | 66 violations | deferred |

The first three are type-only, so none of them can change what the
application does at runtime:

- A default on a **required** prop is unreachable for every typed caller —
  the type forces the prop to be passed, so the default only fired for a
  caller passing `undefined` explicitly. The props were marked optional
  instead, which is what the code actually did.
- A union like `'admin' | 'user' | string` reads as a constraint and is
  not one: the trailing `string` absorbs the rest. The honest type is
  `string`, with the intended values kept in a comment so the documentation
  survives. Two of them were in the generated Supabase types, which are not
  this repository's to edit, and two came from slate's own `HistoryEditor`,
  whose `writeHistory` signature declares an `any` — that one carries a
  narrow, documented suppression.
- A type assertion is **erased at compile time**, so removing one cannot
  change what runs. 147 of them, across 69 files, and the linter fixed
  them itself. The five it could not fix mechanically were cases where the
  assertion was carrying a *type argument*: `Editor.above(editor, …) as
  NodeEntry<Element> | undefined` becomes `Editor.above<CustomElement>(
  editor, …)`, which is the same type with nothing erased at runtime. Three
  were in `SettingsClient.tsx`, where the assertion was hiding the
  `undefined` that the optional chain produced — the fix there is the
  `(serverSettings?.allowedOrigins || [])` idiom the same file already
  uses, which is the one place in this batch that changes behaviour, and
  only in the case where the value was `undefined` before.

`no-floating-promises` was the one that mattered most, and it was also the
one that needed judgement rather than a mechanical fix. An un-awaited promise
fails silently, and 52 of them were real. The two answers are different:

- **`await` where the call has to finish before the handler is done.** Three
  of these complete a login session, and the `try/catch` around them could
  not catch a failure to establish the session, because the call was not
  awaited. A network drop after the password was accepted left the user
  looking at a spinner with no message. `completeSession` handles its own
  errors and never rejects, so awaiting it is behaviour-neutral — it is the
  *intent* that was unstated.
- **`void` where it is fire-and-forget by design.** The loaders, the
  prefetch, the cleanup, the clipboard write, the progress sync, the
  navigation chains inside effects. `void` says so, and the promise is the
  same one as before.

So unlike the three above, this one is not provably inert — which is why the
e2e suite, which logs in through the form that changed, had to be green
before the rule was switched on.

#### 4.8.4 The lint debt may shrink, but it may not grow

A deferred rule is switched off, and a rule that is switched off reports
nothing — so the debt it carries grows silently, and a new `any` would join
the ones nobody is counting.

`scripts/lint-debt.ts` turns that into a number. For each deferred rule, the
linter runs with that rule switched on, and the count is compared with the
baseline in `bunfig.toml` under `[lint-debt]`. A rule with more violations
than its baseline fails the gate; a rule with fewer is reported, so the
baseline can be lowered and the debt marked as paid.

The baseline is the *pre-existing* debt, not the current count: the scripts
this repository added were written to not contribute to it, and the ratchet
is what proved it. It caught two of them — an `async` function with nothing
to await, and a `.catch()` on a function that had stopped returning a
promise — on the run that introduced it.

One rule is linted per run, deliberately. Bun's linter drops type-aware
rules when several are switched on at once: asking for
`no-unsafe-member-access` alongside four others reports **zero** for it,
against 355 on its own. A ratchet that cannot see a violation is worse than
no ratchet.

#### 4.8.5 The `any` cleanup, and what it is actually worth

The `no-unsafe-*` family is 521 violations, and they are not 521 problems.
They are what a smaller number of `any`s become: one `any` in a row type
propagates into every property access on it, and each of those is reported
separately.

So the work is not to fix 521 violations. It is to remove the `any`s, and
the unsafe-\* count falls on its own.

Two of the `any`s in the biggest file are *load-bearing* and stayed. The
mobile mapper's return type is `any` because it emits both snake_case and
camelCase keys while the Zod model declares only the camelCase subset —
narrowing it is a change to a mobile API contract, and the typecheck says
so loudly. The row fields duplicate the backend's copy of the same contract.
Those are decisions, not cleanups, and the `any` is what keeps the decision
visible.

The first pass took the `any` count from 121 to 67 and the unsafe-\* count
from 738 to 618. Four moves paid for it:

- **Redundant annotations.** `map((ba: any) => ba.authors)` erases a type
  the array already has. Removing the annotation is type-only, and the
  compiler then points at the real problem — `filter(Boolean)` does not
  narrow, so the element is `… | null | undefined` and `a.name` was never
  safe. A type predicate says what the filter actually does.
- **The root, not the symptom.** Most of the remaining `any`s were not where
  they were reported. A `data.results` that arrived as `any` made the array
  `any[]`, which made every element access on it unchecked. Typing the
  *response* removed the array's `any` and the callbacks' annotations with
  it. Fixing the reported line would have changed nothing.
- **`catch (error: any)`.** A thrown value is not an Error until it is
  checked. `catch (error)` makes it `unknown`, which is what it is, and the
  narrowing is then explicit. For the rethrow sites the message is
  identical; the only difference shows for a non-Error throw, where the old
  code produced the literal `"undefined"`.
- **Types that were dead.** `src/types/index.ts` exported `Bookmark` and
  `Narrator` as `any`, plus two expanded types that nothing imported. There
  is no `bookmarks` table and no `narrators` table in the schema, so there
  was nothing to alias, and one of the dead types described a select string
  -- `book_narrators(narrators(*))` -- that the database cannot serve. An
  `any` is the worst way to leave that standing.

The second pass took the `any` count from 67 to 52 and the unsafe-\* count
from 618 to 521, and it is the same lesson again: the fix is almost never
on the line the linter reports.

- **A third-party JSON response.** `response.json()` is `any`, so
  `data.docs as any[]` made every field read on a document unchecked —
  68 violations from two casts in `src/shared/lib/coverFetch.ts`. Declaring
  the shape the API actually sends (Open Library, Google Books, iTunes) and
  typing the response as it turned 68 violations into none, and the `any`
  count by four. The three providers are the only places in the repository
  that talk to an API whose types nobody maintains for us.
- **The page envelope.** The five list endpoints answer with different item
  types and the bookshelf hooks read them uniformly, so the hooks widened
  the response to `any` and read `results` and `authors` off it. Every one
  of those responses is already assignable to a single structural type —
  `BookshelfPageResponse` — so the union needed a name, not an `any`.
- **A type that was never used.** `SessionCookieSetter` was declared in
  `src/shared/lib/api/client.ts` and referenced nowhere. It was not a
  finding; it was a leftover, and it went with the `any` in it.
- **A DOM property and a lucide icon.** `DropdownMenuItem.icon` was `any`
  and `InstallPrompt`'s deferred prompt was `any`, and both had an exact
  type available: `LucideIcon`, and an interface for the
  `beforeinstallprompt` event the DOM lib does not carry.

#### 4.8.6 The gate builds the thing that ships

Every other step in the gate checks the source. None of them proves the
application *builds*, and the build is the artifact that ships — on Vercel
and in the container image alike.

Three failures live only in a production build:

- A server component that reaches for a client-only value, or a client
  component that imports a server-only one. The dev server warns about it;
  the build refuses.
- `output: 'standalone'` tracing, which fails on a dependency the tracer
  cannot follow — and the container image is assembled from that output.
- Static generation and ISR, which run at build time and nowhere else.

CI runs the build, so a break is found. It is found *after* the push, on
the deploy's clock, with the deploy held up until it is. The gate builds
first, so the same break is a red gate instead.

The bundle budget runs against the build it just produced, so the number is
measured on the same artifact that would be deployed — and it is measured
before the e2e starts a dev server, which writes its own output beside the
production chunks rather than into them.

The build clears `.next` and the e2e needs a dev server, so the order is
the one that leaves both intact: build, measure, then serve.

**And then the build's output is cleared**, before the e2e starts. Two
reasons, and the first one is the obvious one: a production build leaves
363 MB behind, and the e2e's dev server writes its own output beside it.
On a host that does not have the room, a dev server that cannot write is a
dev server that dies, and the run fails with a refused connection that
says nothing about the product.

The second is subtler: `next dev` and `next build` do not share a `.next`
directory, and a dev server that starts next to a production build's
manifests is running against artifacts it did not make. The e2e should
test the tree, not the tree plus a build.

#### 4.8.7 A red end-to-end run says what let it down

The suite talks to a remote backend, to a browser, and to a dev server on a
shared host. When it fails, the failure never says which of those three let
it down — the assertion is always about the UI, because the UI is what the
test can see. A Play button that never becomes Pause is the symptom of a
playback session that was never created, and the session is created by the
backend.

So the gate reads its own output on the way out and reports what the run
was up against:

- **How many navigations were refused.** A refused connection is the
  signature of a dev server that died. That is infrastructure rather than a
  product regression, and it is the one failure a fresh server fixes — so
  the gate retries it once, on a new server, before it calls the run red.
  Whether the server is still there is a question about the port, and the
  port question has the answer the other way round from what the exit code
  suggests: `lsof -ti` exits zero when it finds a holder, so a *free* port
  is the one that exits non-zero. Getting that backwards meant the retry
  fired when the server was alive and never fired when it had died — which
  is the case the retry exists for, so on a busy host the recovery never
  ran and the run was reported as infrastructure when it could have been
  recovered. The decision is `shouldRetryOnFreshServer` in
  `scripts/e2e-signals.ts`, and it has its own tests.
- **How many 5xx responses the API answered with.** This one reports only.
  It does not pass or fail the run, because a backend that answers 500 and
  a product that is genuinely broken can produce the same assertion
  failure — but they are not the same bug, and the reader should not have
  to guess which one they are looking at.
- **How the host was doing while the suite ran.** The lowest free memory,
  the lowest free swap, and the dev server's high-water mark, sampled
  every five seconds. A snapshot taken after the failure is taken after
  the dev server has died, and a dead process has already given its memory
  back — so the snapshot says the host was fine at the moment the host was
  not.

The counters live in `scripts/e2e-signals.ts` and have their own tests. A
report that is wrong is worse than no report: it tells a reader the backend
was healthy when it was answering 500, and they go looking in the wrong
place.

#### 4.8.8 Four files have to travel with every build

`bun install` needs two things that are not dependencies:

- **`scripts/prepare.ts`** — the project's own `prepare` lifecycle hook.
  `bun install` runs it when the install finishes, and a hook that cannot
  be found fails the install.
- **`scripts/security-scanner.ts`** — the scanner `bunfig.toml`
  configures. A configured scanner that cannot be found fails the install
  too, with `SecurityScannerNotInDependencies`.

And the build needs two more, because the build ends with the type gate:

- **`scripts/tsrs.ts`** — `bun run typecheck`, and therefore the last step
  of `bun run build`.
- **`scripts/tsrs-resolve.ts`** — which `scripts/tsrs.ts` imports for the
  platform lookup.

So four files have to be present wherever an install or a build happens. The
container images copy the first two into the dependency stage, and
`.vercelignore` re-includes all four:

```
/scripts/*
!/scripts/prepare.ts
!/scripts/security-scanner.ts
!/scripts/tsrs.ts
!/scripts/tsrs-resolve.ts
```

The pattern is `/scripts/*` and not `/scripts/` on purpose. A gitignore
cannot re-include a file whose parent directory is excluded, so excluding
the directory itself would silently exclude these files along with it.
Everything else in `scripts/` stays out of the deployment.

**The list is checked, not remembered.** `scripts/verify-deploy-files.ts`
derives what a deployment actually runs — the `prepare` hook, the
configured scanner, and the `build` script followed through its
`bun run <script>` references to the type gate — adds everything those
files import, and checks each one against the patterns in `.vercelignore`.
A file that is needed and excluded is named, and the gate fails.

That check exists because of what it catches. A script the build needs,
left behind by the exclusion, produces a build that works perfectly
locally and fails on Vercel only — at the *last* step, after the whole
compile, after the static generation, after everything that takes minutes.
It is the kind of failure that costs an afternoon.

Local Bun must be a canary: `bun lint` and `bun fmt` do not exist in a
released Bun. `engines.bun` and `devEngines` enforce the 1.4.x series — they
are deliberately not tightened to the canary, because Vercel installs on a
stable Bun and `devEngines` with `onFail: "error"` would fail the deployment.
The canary requirement is enforced by `scripts/require-canary.ts` instead,
which fails with an actionable message rather than "Script not found".

There is no `.npmrc` — that file was npm's mechanism, and `devEngines` with
`onFail: "error"` is Bun's equivalent.

#### 4.8.9 The first load is the number that matters

`bun run size` measures two things, because they fail differently.

**The total** is every client chunk: what the container image serves. It was
the only measurement there was, and it cannot see the failure that matters,
because a library that is loaded on demand is *still in the build* — the
chunk exists either way, so the total does not move.

**The initial payload** is the chunks one route loads when it is first
visited: what a visitor waits for. It comes from Next's own route manifests,
which list the chunks of the page and of the layouts above it.

Two libraries were in the app shell's chunk graph, which means every
authenticated page shipped them before it could render:

- **hls.js, 172 KB gzipped.** The HLS transcoding player, imported
  statically by the local audio player, which the player context imports,
  which the app shell imports. It is only ever needed for a transcoded
  stream, and it was in the first load of every page on the site. It is now
  loaded on demand, by the one code path that needs it.
- **posthog-js, 84 KB gzipped.** The analytics tracker, imported at module
  scope by the provider in the root layout — so the login page shipped it
  too. Analytics is not on the critical path of anything a visitor is
  waiting for, so it is loaded after the page renders. The calls that arrive
  before it does are queued and replayed, so a sign-in fired during the
  first render is not lost.

Together they were 256 KB gzipped of every authenticated page's first load.
The median route's initial payload is now 284 KB, down from 540 KB.

The `initialBudget` in `bunfig.toml` is the ceiling on the worst route's
initial payload, and it is the number that stops this from happening again.
A library in the app shell is paid for by every visitor on every page; a
library in a route's own chunk is paid for by the visitors of that route.

**The fonts were the same story.** They were TrueType — one 246 KB file per
weight — with seven unicode ranges all pointing at the same file, so the
ranges selected nothing and every visitor downloaded the lot. A page using
two weights of the body font and the monospace font was pulling 679 KB of
fonts to render a few hundred words.

They are now woff2, split by range, and the browser fetches only the ranges
a page actually renders: 14 KB for Latin, 22 KB for Latin-Extended, per
weight. The same fonts from Google Fonts are already split that way, and
the files are downloaded once and committed, so there is no third-party
request and no build-time dependency — the app serves them itself. The
subsets are Latin and Latin-Extended, which is what the app renders: it
ships English and Polish.

**And the pages did not stream.** There was no `loading.tsx` anywhere in the
repository, so every navigation waited for the whole page: the browser
showed nothing until the server had finished fetching everything the page
needed. A `loading.tsx` is a Suspense boundary around the page, so the
layout is sent as soon as it is ready and the page streams in behind it.
There is one per route group now.

#### 4.8.10 The PWA is a PWA

The app carried `@ducanh2912/next-pwa`, which is a webpack plugin: it hooks
into the webpack build, and this project builds with Turbopack. So it did
nothing at all — there was a web app manifest and no service worker, which
is not a PWA. It is a web page that claims to be one, and a dependency that
could never have worked.

`public/sw.js` is the service worker now, and it is deliberately
conservative:

- The immutable, hashed build output is served from the cache first. Its
  name changes with its content, so a cached one is never stale.
- Everything else — the pages, the API, the data — goes to the network,
  always. An authenticated app's HTML and its data are per-user, and a
  cached copy of either is a bug, not an optimisation.
- Nothing is precached, and the cache is capped.

It never serves a cached page, so a deployment is never shadowed by an
older one. The registration happens after the page has loaded, and not at
all in development, where a service worker that caches the build output is
a stale app waiting to happen.

### 4.9 Every request used to cost a round trip

The proxy — Next.js 16's name for what used to be the middleware — runs on
every request: every page, every API proxy call, every client navigation,
every image. And it called `supabase.auth.getUser()`, which validates the
token with the Supabase auth server. That is a network round trip, on every
request, for a token that is almost always perfectly valid.

Measured from this host, that round trip is 120–270 ms. It was the largest
single cost in the request path, and it was paid before the page did any
work at all.

`getClaims()` verifies the same token locally, against the signing key
discovery endpoint, which is cached; and the session behind it is only
refreshed when it has actually expired — which is the refresh the middleware
is there to do. The refresh still writes through the same cookie adapter, so
the renewed session still lands in the response.

Nothing about *authentication* got weaker. The places that need to know who
the user is — the server components, the API client, the proxy's own admin
checks — ask the auth server themselves, and always did. What the middleware
was doing was refreshing the session, and paying a server round trip to do
it on every request rather than when the token needed it.

For a project signing with a symmetric secret, `getClaims()` falls back to
`getUser()`, so this is never worse than it was.

---

## 5. Troubleshooting

### 5.1 All `/api/*` routes return 502 / 404 or "failed to fetch"

**Symptom:** Every request to an `/api/*` path fails with a network error, 502 Bad Gateway, or 404 Not Found, often with no useful response body.

**Root cause:** `NEXT_PUBLIC_SUPABASE_URL` was not set in the Vercel build environment. Because `NEXT_PUBLIC_*` variables are inlined at build time, the rewrite destination in `next.config.ts` resolved to a string like `undefined/functions/v1/api/*` at compile time and was baked into the build output.

**Fix:**

1. In the Vercel dashboard, go to **Settings → Environment Variables** and verify that `NEXT_PUBLIC_SUPABASE_URL` is set to your Supabase project URL for every environment (Production, Preview, and Development).
2. Trigger a fresh deployment — either push a new commit or click **Redeploy** in the Vercel dashboard. A redeploy without a new build will not pick up the corrected variable; the project must be rebuilt.
3. Confirm the `/api/*` routes respond correctly after the new deployment goes live.

---

### 5.2 Server actions or API routes return 500 with "Missing environment variable: SUPABASE_SERVICE_ROLE_KEY"

**Symptom:** Server-side operations (file uploads, user management, admin queries) return an HTTP 500 error. The Vercel function log shows: `Error: Missing environment variable: SUPABASE_SERVICE_ROLE_KEY`.

**Root cause:** Neither `SUPABASE_SERVICE_ROLE_KEY` nor the legacy alias `SUPABASE_SERVICE_KEY` is set in the Vercel environment where the request ran. This happens most often on Preview deployments that were not given the server-side variables when the project was first configured.

**Fix:**

1. In the Vercel dashboard, go to **Settings → Environment Variables**.
2. Add `SUPABASE_SERVICE_ROLE_KEY` with the service role key value from the Supabase dashboard (**Settings → API → service_role key**).
3. Apply it to the affected environment(s) — at minimum Production and Preview.
4. Redeploy the affected environment. Unlike build-time variables, server-side variables take effect on the next invocation after the deployment completes, but a new deployment is still recommended to ensure consistency.

See [§2](#2-supabase_service_role_key-vs-supabase_service_key) if you are migrating from the old `SUPABASE_SERVICE_KEY` name.

---

### 5.3 OAuth or email confirmation links redirect to the wrong URL

**Symptom:** After clicking a confirmation email, magic link, or password-reset link, the user is redirected to the wrong domain (e.g. the production domain instead of the Preview URL, or vice versa). OAuth sign-in completes but the callback lands on an unexpected host.

**Root cause:** `NEXT_PUBLIC_SITE_URL` in Vercel does not match the **Site URL** configured in the Supabase Auth dashboard, or the destination URL is not listed in the Supabase Auth **Redirect URLs** allow list. Supabase generates auth email links server-side using its own "Site URL" setting, independently of any Next.js configuration.

**Fix:**

1. Align the two settings:
   - Vercel: set `NEXT_PUBLIC_SITE_URL` to the correct canonical URL for each environment (see [§3](#3-next_public_site_url-and-supabase-auth) for per-environment values).
   - Supabase: set **Authentication → URL Configuration → Site URL** to match the production value of `NEXT_PUBLIC_SITE_URL`.
2. Add wildcard Preview URL patterns to **Authentication → URL Configuration → Redirect URLs** in the Supabase dashboard (e.g. `https://audiobookphile-web-*.vercel.app/**`) so that auth redirects to Preview deployments are permitted.
3. Redeploy the Vercel project so the updated `NEXT_PUBLIC_SITE_URL` is baked into the new build.
