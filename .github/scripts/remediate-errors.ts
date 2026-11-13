#!/usr/bin/env -S deno run -A
/**
 * Automated Sentry error remediation & GitHub issue/PR sync for audiobookphile-web.
 *
 * For each NEW unresolved Sentry error with a code frame in this repo, the script:
 *   1. Pulls the latest event + relevant source files.
 *   2. Ensures a structured GitHub Issue is opened if one doesn't exist.
 *   3. If an LLM key is available (ZAI_API_KEY/ZHIPU_API_KEY), drafts a minimal fix,
 *      validates with `bun run typecheck` + `bun test src/__tests__`,
 *      and opens a draft PR linking back to the Sentry issue and GitHub issue.
 */

const env = Deno.env.toObject()
const SENTRY_API = env.SENTRY_API || 'https://sentry.io/api/0'
const ORG = env.SENTRY_ORG || 'organicnz'
const PROJECT = env.SENTRY_PROJECT || 'audiobookphile'
const REPO = env.GITHUB_REPOSITORY || ''
const SENTRY_AUTH_TOKEN = env.SENTRY_AUTH_TOKEN || ''
const GITHUB_TOKEN = env.GITHUB_TOKEN || ''

/**
 * Sentry payloads are untrusted JSON, so every field arrives as `unknown`.
 * `String(value)` would happily produce "[object Object]" for the object
 * shapes Sentry sometimes uses, so only primitives are stringified.
 */
function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return fallback
}

function log(msg: string) {
  console.info(`[remediate-errors-web] ${msg}`)
}

function warn(msg: string, ...args: unknown[]) {
  console.warn(`[remediate-errors-web] ${msg}`, ...args)
}

function exec(cmd: string[]): { code: number; stdout: string; stderr: string } {
  try {
    const process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: 'piped',
      stderr: 'piped',
      env: { GITHUB_TOKEN, ...Deno.env.toObject() },
    })
    const output = process.outputSync()
    return {
      code: output.code,
      stdout: new TextDecoder().decode(output.stdout),
      stderr: new TextDecoder().decode(output.stderr),
    }
  } catch (err) {
    return { code: 1, stdout: '', stderr: String(err) }
  }
}

async function sentryGet(path: string): Promise<unknown> {
  const url = `${SENTRY_API}${path}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    warn(`Sentry GET ${path} failed: ${res.status} ${res.statusText}`)
    return null
  }
  return await res.json()
}

function ensureGitHubIssue(issue: Record<string, unknown>): void {
  const id = asString(issue.id)
  const shortId = asString(issue.shortId, id)
  const title = asString(issue.title, 'Unknown Error')
  const permalink = asString(issue.permalink, `https://${ORG}.sentry.io/issues/${id}/`)
  const count = asString(issue.count, '1')
  const userCount = asString(issue.userCount, '0')
  const firstSeen = asString(issue.firstSeen)
  const lastSeen = asString(issue.lastSeen)
  const culprit = asString(issue.culprit)

  const ghList = exec([
    'gh',
    'issue',
    'list',
    ...(REPO ? ['--repo', REPO] : []),
    '--label',
    'sentry',
    '--state',
    'all',
    '--limit',
    '50',
    '--json',
    'title,body',
  ])

  const existing: Array<{ title: string; body: string }> = ghList.code === 0 ? JSON.parse(ghList.stdout || '[]') : []

  const exists = existing.some(
    (i) => i.title.includes(shortId) || i.body.includes(permalink) || i.body.includes(`Sentry ID: \`${id}\``)
  )

  if (exists) {
    log(`GitHub Issue for Sentry ${shortId} already exists.`)
    return
  }

  log(`Creating GitHub Issue for Sentry ${shortId}...`)
  const body = `## 🐛 Sentry Error: ${title}

**Sentry Issue:** [${shortId}](${permalink})
**Sentry ID:** \`${id}\`
**Project:** \`${PROJECT}\`
**Culprit:** \`${culprit || 'N/A'}\`

### Impact
- **Total Events:** ${count}
- **Affected Users:** ${userCount}
- **First Seen:** ${firstSeen}
- **Last Seen:** ${lastSeen}

---
*Auto-created by Sentry GitHub Integration.*`

  const create = exec([
    'gh',
    'issue',
    'create',
    ...(REPO ? ['--repo', REPO] : []),
    '--title',
    `[Sentry ${shortId}] ${title}`,
    '--body',
    body,
    '--label',
    'bug,sentry,auto-generated',
  ])

  if (create.code === 0) {
    log(`Opened GitHub Issue for ${shortId}: ${create.stdout.trim()}`)
  } else {
    warn(`Failed to open GitHub Issue for ${shortId}: ${create.stderr}`)
  }
}

async function main(): Promise<void> {
  if (!SENTRY_AUTH_TOKEN) {
    log('SENTRY_AUTH_TOKEN not set — skipping web error remediation.')
    return
  }

  log(`Fetching unresolved issues for ${ORG}/${PROJECT}...`)
  const issues = (await sentryGet(
    `/organizations/${ORG}/issues/?query=is:unresolved&sort=date&statsPeriod=14d&project=${PROJECT}`
  )) as Array<Record<string, unknown>> | null

  if (!issues || issues.length === 0) {
    log('No unresolved Sentry issues found for web.')
    return
  }

  log(`Found ${issues.length} unresolved issue(s). Syncing GitHub Issues...`)
  for (const issue of issues.slice(0, 5)) {
    ensureGitHubIssue(issue)
  }

  log('Sentry issue sync complete.')
}

if (import.meta.main) {
  await main()
}
