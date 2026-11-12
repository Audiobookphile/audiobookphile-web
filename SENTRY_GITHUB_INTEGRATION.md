# Sentry GitHub Integration Setup

This document describes how to configure Sentry to automatically create issues and link pull requests in GitHub.

## Overview

Sentry's GitHub integration enables:

- **Automatic Issue Creation**: Errors automatically create GitHub issues
- **PR Integration**: Pull requests are linked to Sentry releases
- **Commit Integration**: Commits are associated with errors for better context
- **Issue Deduplication**: Sentry prevents duplicate issues for the same error

## Setup Instructions

### 1. Install the GitHub Integration in Sentry

1. Navigate to [Sentry.io](https://sentry.io) → Settings → Integrations
2. Find "GitHub" and click "Install"
3. Authorize Sentry to access your GitHub organization
4. Select the repositories to link (e.g., `Audiobookphile/audiobookphile-web`)

### 2. Configure Issue Sync

In Sentry project settings:

- Go to **Settings → Projects → audiobookphile → Issue Sync**
- Enable "Create GitHub issues for new errors"
- Set issue labels (e.g., `bug`, `sentry`, `auto-generated`)
- Configure issue templates for structured issue descriptions

### 3. Configure Release Tracking

Releases are automatically tracked via the `release` field in Sentry configs:

```typescript
release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA
```

### 4. Environment Variables Required

Set these in your deployment environment (Vercel, GitHub Actions, etc.):

```bash
# Sentry DSN (required for error reporting)
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o0.ingest.sentry.io/0
SENTRY_DSN=https://your-key@o0.ingest.sentry.io/0  # Server-side

# Sentry authentication (for Sentry CLI during builds)
SENTRY_AUTH_TOKEN=your-auth-token

# Sentry organization and project
SENTRY_ORG=organicnz
SENTRY_PROJECT=audiobookphile
```

### 5. GitHub Actions Integration

`.github/workflows/sentry-release.yml` creates a Sentry release for every push to `main` (SHA release with `set_commits: auto` for suspect-commits → PR/author linking). Source maps are uploaded during `next build` by `withSentryConfig` when `SENTRY_AUTH_TOKEN` is set; the `deploy-web.yml` build steps pass through `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` from secrets (empty fallback = Sentry stays disabled, build unaffected). Required secrets: `SENTRY_AUTH_TOKEN` (scopes: project:read, project:write, project:releases, org:read), `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`.

## How It Works

### Issue Creation Flow

1. **Error Occurs** → Sentry captures the error event
2. **Issue Created** → Sentry creates a GitHub issue with error details
3. **PR Linked** → When a PR references the issue, Sentry links it
4. **Auto-Close** → When the error is resolved, Sentry can auto-close the issue

### PR Integration

When a PR is merged:

1. Sentry receives a webhook from GitHub
2. The PR is associated with the release
3. Issue resolution is tracked automatically

### Commit Integration

Commits are automatically associated with errors:

- **Author**: Who wrote the code
- **Commit SHA**: Exact code version
- **Repository**: Source repository
- **Message**: Commit message with issue references

## Enhanced Features Enabled

### 1. Breadcrumbs

Track user actions leading to errors:

```typescript
Sentry.addBreadcrumb({
  category: 'user',
  message: 'Clicked play button',
  level: 'info'
})
```

### 2. User Context

Identify affected users:

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username
})
```

### 3. Tags

Categorize errors:

```typescript
Sentry.setTag('component', 'AudioPlayer')
Sentry.setTag('feature', 'playback')
```

### 4. Extra Context

Add arbitrary data:

```typescript
Sentry.setExtra('audiobook_id', audiobookId)
Sentry.setExtra('playback_position', position)
```

### 5. Fingerprinting

Customize issue grouping:

```typescript
Sentry.withScope((scope) => {
  scope.setFingerprint(['{{ default }}', audiobookId])
  Sentry.captureException(error)
})
```

## Monitoring & Metrics

### Performance Metrics

Track API performance:

```typescript
Sentry.metrics.increment('api_requests_total', 1, {
  tags: { method: 'GET', status: '200' }
})

Sentry.metrics.distribution('api_request_duration', durationMs, {
  unit: 'millisecond',
  tags: { endpoint: '/api/items' }
})
```

### Custom Dashboards

Create dashboards for:

- Error rate by release
- Issue resolution time
- User impact
- Performance trends

## Best Practices

### 1. Error Grouping

Use consistent fingerprints to group related errors.

### 2. Release Hygiene

- Create releases for every deployment
- Use semantic versioning or commit SHAs
- Tag releases with environment metadata

### 3. Issue Management

- Set up issue automation rules
- Use labels for triage
- Configure auto-assignment based on error type

### 4. Privacy

- Never send PII by default (`sendDefaultPii: false`)
- Anonymize user data before sending
- Use scrubbing rules for sensitive data

## Troubleshooting

### Issues Not Being Created

1. Check GitHub integration is installed
2. Verify repository permissions
3. Check issue sync settings in Sentry

### Releases Not Tracking

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check `VERCEL_GIT_COMMIT_SHA` environment variable
3. Ensure Sentry CLI runs during build

### Performance Issues

1. Adjust `tracesSampleRate` for production
2. Use `tracesSampler` for dynamic sampling
3. Filter out health checks and static assets

## Resources

- [Sentry GitHub Integration Docs](https://docs.sentry.io/product/integrations/source-code-mgmt/github/)
- [Sentry Release Management](https://docs.sentry.io/product/releases/)
- [Sentry Issue Grouping](https://docs.sentry.io/platform-redirects/?platform=javascript/data-management/event-grouping/)

---

_Last updated: 2026-09-09_
