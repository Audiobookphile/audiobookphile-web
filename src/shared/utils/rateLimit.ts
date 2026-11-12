interface RateLimitOptions {
  uniqueTokenPerInterval?: number
  interval?: number
}

export function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new Map()
  let lastCleanup = Date.now()
  const interval = options?.interval || 60000 // default 1 minute
  const maxTokens = options?.uniqueTokenPerInterval || 500

  return {
    check: (limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        // Cleanup cache periodically to avoid memory leaks
        const now = Date.now()
        if (now - lastCleanup > interval) {
          tokenCache.clear()
          lastCleanup = now
        }

        const tokenCount = (tokenCache.get(token) || [0])[0]
        if (tokenCount === 0 && tokenCache.size >= maxTokens) {
          // Deny if max unique IP limit reached to prevent memory exhaustion
          return reject(new Error('Rate limit memory exhaustion'))
        }

        const newCount = tokenCount + 1
        tokenCache.set(token, [newCount, now])

        if (newCount > limit) {
          return reject(new Error('Rate limit exceeded'))
        }

        return resolve()
      }),
  }
}
