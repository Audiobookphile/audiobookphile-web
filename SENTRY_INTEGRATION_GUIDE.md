# Sentry Integration Guide for Audiobookphile

This guide explains how to integrate Sentry error tracking throughout your application.

## Quick Start

### 1. Environment Variables

Set these in your `.env.local` or deployment environment:

```bash
# Sentry DSN (required)
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o0.ingest.sentry.io/project-id
SENTRY_DSN=https://your-key@o0.ingest.sentry.io/project-id

# Sentry Auth Token (for CLI - used in CI/CD)
SENTRY_AUTH_TOKEN=sntrys_your_token_here

# Organization and Project
SENTRY_ORG=organicnz
SENTRY_PROJECT=audiobookphile
```

### 2. Import Utilities

```typescript
import { setSentryUser, clearSentryUser, trackUserAction, captureError, measurePerformance } from '@/shared/lib/sentry'
```

## Integration Points

### Authentication

**After Login:**

```typescript
// In your auth context or login handler
import { setSentryUser } from '@/shared/lib/sentry'

async function handleLogin(user: User) {
  // ... authentication logic

  // Set Sentry user context
  setSentryUser({
    id: user.id,
    email: user.email,
    username: user.username
  })
}
```

**On Logout:**

```typescript
import { clearSentryUser } from '@/shared/lib/sentry'

function handleLogout() {
  clearSentryUser()
  // ... logout logic
}
```

### Audio Player

**Track Playback Events:**

```typescript
import { trackUserAction } from '@/shared/lib/sentry'

function AudioPlayer() {
  const handlePlay = () => {
    trackUserAction('play_audiobook', {
      audiobookId: book.id,
      chapterIndex: currentChapter,
      position: currentPosition
    })
    // ... play logic
  }

  const handleBookmark = () => {
    trackUserAction('create_bookmark', {
      audiobookId: book.id,
      position: currentPosition
    })
    // ... bookmark logic
  }
}
```

**Track Errors:**

```typescript
import { captureError } from '@/shared/lib/sentry'

async function loadAudioFile(url: string) {
  try {
    // ... load audio
  } catch (error) {
    captureError(error as Error, {
      tags: { component: 'AudioPlayer', feature: 'playback' },
      extra: { url, bookId: currentBook.id },
      fingerprint: ['audio-load-error', currentBook.id]
    })
    throw error
  }
}
```

### API Calls

**In API Client:**

```typescript
import { trackApiCall, captureError } from '@/shared/lib/sentry'

class ApiClient {
  async request(endpoint: string, options: RequestInit) {
    const startTime = performance.now()

    try {
      const response = await fetch(endpoint, options)
      const duration = performance.now() - startTime

      trackApiCall(endpoint, options.method || 'GET', response.status, duration)

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      const duration = performance.now() - startTime
      trackApiCall(endpoint, options.method || 'GET', 0, duration)

      captureError(error as Error, {
        tags: { component: 'ApiClient' },
        extra: { endpoint, method: options.method }
      })

      throw error
    }
  }
}
```

### Performance Monitoring

**Track Slow Operations:**

```typescript
import { measurePerformance } from '@/shared/lib/sentry'

async function loadLargeLibrary() {
  return measurePerformance('load_library_items', async () => {
    const response = await fetch('/api/libraries/main/items')
    return response.json()
  })
}
```

### React Components

**Wrap Components with Error Tracking:**

```typescript
import { withSentryTracking } from '@/shared/lib/sentry'

const LibraryList = ({ libraryId }: { libraryId: string }) => {
  // Component logic
  return <div>...</div>
}

export default withSentryTracking(LibraryList, 'LibraryList')
```

**Use Error Boundaries:**

```typescript
import { ErrorBoundary } from '@/shared/ErrorBoundary'

function AppRoot() {
  return (
    <ErrorBoundary
      componentName="AppRoot"
      context={{ version: process.env.NEXT_PUBLIC_APP_VERSION }}
    >
      <App />
    </ErrorBoundary>
  )
}
```

### Custom Hooks

**Create Tracking Hook:**

```typescript
import { useEffect } from 'react'
import { trackUserAction } from '@/shared/lib/sentry'

export function useSentryTracking(componentName: string, data?: Record<string, any>) {
  useEffect(() => {
    trackUserAction('component_mount', { component: componentName, ...data })

    return () => {
      trackUserAction('component_unmount', { component: componentName })
    }
  }, [componentName, data])
}

// Usage
function AudiobookPlayer({ bookId }: { bookId: string }) {
  useSentryTracking('AudiobookPlayer', { bookId })

  return <div>...</div>
}
```

## Best Practices

### 1. User Privacy

- Never send PII (personally identifiable information) without consent
- Use anonymized user IDs instead of emails in some cases
- Respect user privacy settings

### 2. Error Grouping

Use fingerprints to group related errors:

```typescript
captureError(error, {
  fingerprint: ['audio-error', bookId] // Group by book
})
```

### 3. Breadcrumbs

Add breadcrumbs to track user journey:

```typescript
trackUserAction('click_play_button', { bookId: '123' })
trackUserAction('change_playback_speed', { speed: 1.5 })
```

### 4. Tags for Filtering

Use tags for easy filtering in Sentry:

```typescript
captureError(error, {
  tags: {
    component: 'AudioPlayer',
    feature: 'playback',
    userTier: 'premium'
  }
})
```

### 5. Extra Context

Add contextual information:

```typescript
captureError(error, {
  extra: {
    bookId: currentBook.id,
    chapterIndex: currentChapter,
    playbackPosition: position,
    networkStatus: navigator.onLine ? 'online' : 'offline'
  }
})
```

## GitHub Integration

### Automatic Issue Creation

Once configured, Sentry will automatically create GitHub issues for new errors:

1. Go to Sentry.io → Settings → Integrations → GitHub
2. Install and authorize GitHub access
3. Configure issue sync settings

### PR Integration

Pull requests are automatically linked to releases:

- Sentry creates a release for each PR
- Commits are associated with errors
- Issues are auto-closed when errors are resolved

## Monitoring Dashboard

Create custom dashboards in Sentry for:

- Error rate by release
- User impact metrics
- Performance trends
- API endpoint health

## Troubleshooting

### Errors Not Appearing

1. Check DSN is configured correctly
2. Verify `SENTRY_AUTH_TOKEN` is set for CI/CD
3. Check browser console for Sentry initialization errors

### Performance Issues

1. Adjust `tracesSampleRate` in production (currently 0.1 = 10%)
2. Use `tracesSampler` for dynamic sampling
3. Filter out health checks and static assets

### Duplicate Errors

Use fingerprints to control grouping:

```typescript
captureError(error, {
  fingerprint: ['custom-grouping', 'identifier']
})
```

## Resources

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry GitHub Integration](https://docs.sentry.io/product/integrations/source-code-mgmt/github/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

---

_Last updated: September 2026_
