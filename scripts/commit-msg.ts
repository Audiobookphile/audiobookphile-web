#!/usr/bin/env bun
/**
 * Conventional-commit gate for lefthook.
 *
 * Usage: bun run scripts/commit-msg.ts <commit-message-file>
 */

// Allow merge commits
async function main(): Promise<void> {
  const raw = await Bun.file(process.argv[2] ?? '').text()

  if (raw.startsWith('Merge branch')) {
    process.exit(0)
  }

  // Git's subject line is the first line of the message, and it is the only
  // part Conventional Commits applies to. The body is free-form.
  const subject = raw.split('\n')[0].trim()

  // Conventional commit pattern regex:
  // feat|fix|perf|refactor|docs|test|chore|ci|style|build|revert(\(scope\))?!?: message
  const CONVENTIONAL_REGEX =
    /^(feat|fix|perf|refactor|docs|test|chore|ci|style|build|revert)(\([a-zA-Z0-9_-]+\))?!?: .+$/

  if (!CONVENTIONAL_REGEX.test(subject)) {
    console.log('')
    console.log('❌ INVALID COMMIT MESSAGE FORMAT!')
    console.log('--------------------------------------------------------')
    console.log(`Your commit message: "${subject}"`)
    console.log('')
    console.log('Commit messages must follow Conventional Commits format:')
    console.log('  <type>(<optional-scope>): <description>')
    console.log('')
    console.log('Examples:')
    console.log('  feat(web): add responsive audio player UI')
    console.log('  fix(auth): fix session refresh cookie handler')
    console.log('  perf: optimize image lazy loading')
    console.log('  chore: update Bun packages')
    console.log('--------------------------------------------------------')
    process.exit(1)
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('commit-msg check failed:', error)
  process.exit(1)
})

// A module, not a script: TypeScript gives every script file a shared global
// scope, so two of these declaring `main` would collide.
export {}
