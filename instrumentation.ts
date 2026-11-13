export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')

    // Automatically provision root administrator upon deployment if ADMIN_EMAIL is configured
    try {
      const { autoProvisionAdminFromEnv } = await import('@/features/auth/actions/setupActions')
      await autoProvisionAdminFromEnv()
    } catch {
      // Ignore background auto-provision failures on cold-start
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs'
