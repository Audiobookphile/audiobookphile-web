'use client'

import { AlertTriangle, CheckCircle2, Database, ExternalLink, HardDrive, Loader2, Mail, RefreshCw, Server, ShieldCheck, Sparkles, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { createInitialAdmin, type SetupResult } from '@/features/auth/actions/setupActions'
import AuthCard from '@/features/auth/components/AuthCard'
import MobileConnectCard from '@/features/auth/components/MobileConnectCard'
import Btn from '@/shared/ui/Btn'

interface SetupStatus {
  configured: boolean
  serverUrl?: string
  canAutoBootstrap?: boolean
  reason?: string
  supabaseUrl: string | null
  projectRef: string | null
  sqlEditorUrl: string | null
  credentials?: {
    serverUrl?: string
    supabaseUrl?: string
    hasDemoAccount?: boolean
    demoAccount?: {
      username: string
      password: string
    } | null
    deepLink?: string | null
  }
  database: {
    connected: boolean
    initialized: boolean
    hasAdmin: boolean
    adminCount: number
    libraryCount: number
  }
  storage: {
    ready: boolean
  }
  edgeApi: {
    deployed: boolean
    status: number
  }
}

export default function SetupClient() {
  const router = useRouter()
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)

  const [formState, formAction, isPending] = useActionState<SetupResult | null, FormData>(
    createInitialAdmin,
    null
  )

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/setup/status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Failed to load setup status:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchStatus()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    void fetchStatus()
  }

  const handleAutoBootstrap = async () => {
    setBootstrapping(true)
    setBootstrapMessage(null)
    setBootstrapError(null)
    try {
      const res = await fetch('/api/setup/bootstrap', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        setBootstrapMessage(data.message || 'Database schema initialized successfully!')
        await fetchStatus()
      } else {
        setBootstrapError(data.error || 'Failed to auto-bootstrap database.')
      }
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : 'Network error during auto-bootstrap.')
    } finally {
      setBootstrapping(false)
    }
  }

  if (loading) {
    return (
      <AuthCard title="Checking Environment..." icon="shield">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <Loader2 className="animate-spin text-accent" size={36} />
          <p className="text-sm text-foreground-muted">Probing Supabase instance &amp; database status...</p>
        </div>
      </AuthCard>
    )
  }

  const isCreatedJustNow = Boolean(formState?.ok)
  const isConfigured = status?.configured && status?.database?.connected
  const isSchemaReady = status?.database?.initialized
  const hasAdmin = status?.database?.hasAdmin

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <AuthCard
        title={
          isCreatedJustNow
            ? 'Deployment Complete'
            : hasAdmin
              ? 'Instance Ready'
              : isSchemaReady
                ? 'Create Root Admin'
                : 'Template Setup'
        }
        icon={isCreatedJustNow ? 'mail-check' : hasAdmin ? 'shield' : isSchemaReady ? 'user' : 'key'}
      >
        {/* Subtitle / Description */}
        <p className="mb-6 text-sm text-foreground-muted text-center">
          {isCreatedJustNow
            ? 'Your Audiobookphile server is live, credentials have been generated, and your iOS app is ready to connect.'
            : hasAdmin
              ? 'Your Audiobookphile instance is configured, initialized, and ready to connect.'
              : isSchemaReady
                ? 'Database schema detected! Create your primary owner account to complete setup.'
                : 'Welcome! Your deployment is mapped to Supabase. Complete the one-time database bootstrap below.'}
        </p>

        {/* Diagnostic Badges */}
        <div className="mb-6 space-y-2 rounded-xl border border-border/40 bg-surface-base/60 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-border/20">
            <span className="font-semibold uppercase tracking-wider text-foreground-muted">System Diagnostics</span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 text-accent hover:underline disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
            {/* Supabase Connection */}
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              ) : (
                <XCircle size={15} className="text-rose-500 shrink-0" />
              )}
              <span className="text-foreground-muted">Supabase:</span>
              <span className="font-mono text-foreground truncate max-w-[140px]" title={status?.supabaseUrl || 'Missing'}>
                {status?.projectRef || (isConfigured ? 'Connected' : 'Missing')}
              </span>
            </div>

            {/* Database Schema */}
            <div className="flex items-center gap-2">
              {isSchemaReady ? (
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              ) : (
                <Database size={15} className="text-amber-500 shrink-0 animate-pulse" />
              )}
              <span className="text-foreground-muted">Database:</span>
              <span className={isSchemaReady ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                {isSchemaReady ? 'Schema Ready' : 'Bootstrap Required'}
              </span>
            </div>

            {/* Storage Buckets */}
            <div className="flex items-center gap-2">
              {status?.storage?.ready ? (
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              ) : (
                <HardDrive size={15} className="text-foreground-muted shrink-0" />
              )}
              <span className="text-foreground-muted">Storage:</span>
              <span className="text-foreground">{status?.storage?.ready ? 'Buckets Ready' : 'Standard'}</span>
            </div>

            {/* Edge API */}
            <div className="flex items-center gap-2">
              {status?.edgeApi?.deployed ? (
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              ) : (
                <Server size={15} className="text-amber-500 shrink-0" />
              )}
              <span className="text-foreground-muted">Edge API:</span>
              <span className={status?.edgeApi?.deployed ? 'text-foreground' : 'text-amber-500 font-medium'}>
                {status?.edgeApi?.deployed ? 'Active (HTTP 200)' : 'Not deployed — required'}
              </span>
            </div>
          </div>
        </div>

        {/* The Edge API is not optional: /api/* is rewritten to it, so a
            deployment without it can create an admin but cannot log in. */}
        {status?.configured && !status.edgeApi?.deployed && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-2">
            <p className="flex items-center gap-1.5 font-semibold text-amber-400">
              <AlertTriangle size={15} className="shrink-0" />
              <span>The unified Edge API is not deployed yet</span>
            </p>
            <p className="leading-relaxed text-amber-200/80">
              There is no PostgREST fallback. Login, library, playback, and media routes are all served by the{' '}
              <code className="font-mono">api</code> Edge Function. Create the owner account now if you like, but the app
              will not be usable until this function is live.
            </p>
            <div className="rounded-lg border border-amber-500/20 bg-black/30 p-2.5 font-mono text-[11px] text-amber-100 overflow-x-auto">
              bun run functions:deploy
            </div>
            <p className="text-amber-200/70 leading-relaxed">
              Or run the <strong>Deploy Supabase (Migrations &amp; Edge API)</strong> GitHub workflow after adding{' '}
              <code className="font-mono">SUPABASE_ACCESS_TOKEN</code> and{' '}
              <code className="font-mono">SUPABASE_PROJECT_ID</code> to your repository secrets.
            </p>
          </div>
        )}

        {/* Step: Newly Created Owner Account & Dispatched Email */}
        {isCreatedJustNow ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 space-y-2 text-center">
              <Sparkles className="mx-auto text-emerald-400" size={28} />
              <h3 className="font-bold text-base text-foreground">🎉 Deployment &amp; Setup Successful!</h3>
              <p className="text-xs text-foreground-muted">
                Your Root Administrator account is active and your server is ready.
              </p>
            </div>

            {formState?.emailRecipient && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-sky-200 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-sky-300">
                  <Mail size={16} />
                  <span>Onboarding Credentials Dispatched</span>
                </div>
                <p className="leading-relaxed">
                  An onboarding email with your credentials and 1-click mobile configuration link was dispatched to{' '}
                  <strong className="text-white font-mono">{formState.emailRecipient}</strong>.
                </p>
                <p className="text-[11px] text-sky-300/80 leading-relaxed">
                  Open this email on your iPhone and tap <strong>&ldquo;Connect Audiobookphile iOS Client&rdquo;</strong> to automatically map your server.
                </p>
                {formState.emailTransport === 'console-dev' && (
                  <p className="mt-1 text-[10px] text-sky-300/60 italic">
                    Note: Email logged to server audit console. To enable live delivery to your inbox, configure RESEND_API_KEY in your deployment environment variables.
                  </p>
                )}
              </div>
            )}

            <MobileConnectCard
              serverUrl={formState?.serverUrl || status?.serverUrl}
              defaultEmail={formState?.emailRecipient}
              credentials={{
                deepLink: formState?.deepLink,
              }}
            />

            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push(formState?.redirectTo || '/library')}
                className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold text-sm transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2"
              >
                <span>Enter Audiobookphile Web Client &rarr;</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Database Schema Required */}
            {!isSchemaReady && (
              <div className="space-y-4">
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-foreground">
                  <h4 className="font-semibold text-sky-400 flex items-center gap-1.5 mb-1.5">
                    <Database size={16} />
                    <span>Initialize PostgreSQL Schema &amp; Tables</span>
                  </h4>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    Your Supabase instance is connected. Click below to automatically provision the database tables, Row Level
                    Security (RLS) policies, and storage buckets.
                  </p>
                </div>

                {bootstrapError && (
                  <div className="p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                    {bootstrapError}
                  </div>
                )}

                {bootstrapMessage && (
                  <div className="p-3 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    {bootstrapMessage}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAutoBootstrap}
                    disabled={bootstrapping}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-500/25 active:scale-[0.98] disabled:opacity-50"
                  >
                    {bootstrapping ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Bootstrapping Database Schema...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>🚀 Auto-Initialize Database (1-Click)</span>
                      </>
                    )}
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-border/40" />
                    <span className="flex-shrink mx-3 text-[11px] text-foreground-muted uppercase">or manual sql editor</span>
                    <div className="flex-grow border-t border-border/40" />
                  </div>

                  {status?.sqlEditorUrl && (
                    <a
                      href={status.sqlEditorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-foreground font-medium text-xs transition-all"
                    >
                      <ExternalLink size={14} />
                      <span>Open Supabase SQL Editor</span>
                    </a>
                  )}

                  <Btn
                    color="bg-bg-light"
                    size="medium"
                    className="w-full border border-border flex items-center justify-center gap-2"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    <span>{refreshing ? 'Checking Schema...' : 'Check Status Again'}</span>
                  </Btn>
                </div>
              </div>
            )}

            {/* Step 2: Create Initial Owner Account */}
            {isSchemaReady && !hasAdmin && (
              <form action={formAction} className="space-y-4">
                {formState?.error && (
                  <div className="p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                    {formState.error}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Owner Email</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="admin@example.com"
                      required
                      autoComplete="email"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-bg-light/50 border border-border text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Username (Display Name)</label>
                    <input
                      type="text"
                      name="username"
                      placeholder="admin"
                      autoComplete="username"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-bg-light/50 border border-border text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Password</label>
                    <input
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-bg-light/50 border border-border text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-bg-light/50 border border-border text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 px-4 mt-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-medium text-sm transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Provisioning Owner Account...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Create Owner Account &amp; Enter</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 3: Already Initialized / Completed */}
            {hasAdmin && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 space-y-1 text-center">
                  <Sparkles className="mx-auto text-emerald-400" size={24} />
                  <p className="font-semibold text-sm">Deployment &amp; Backend Ready!</p>
                  <p className="text-xs text-foreground-muted">Your server is live and fully configured.</p>
                </div>

                <MobileConnectCard serverUrl={status?.serverUrl} credentials={status?.credentials} />

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    href="/login"
                    className="flex-1 inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-medium text-sm transition-all shadow-md shadow-accent/20"
                  >
                    Sign In to Web Client &rarr;
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </AuthCard>
    </div>
  )
}
