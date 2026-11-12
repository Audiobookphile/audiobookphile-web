'use client'

import { CheckCircle2, Database, ExternalLink, HardDrive, KeyRound, Loader2, RefreshCw, Server, ShieldCheck, Sparkles, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { createInitialAdmin, type SetupResult } from '@/features/auth/actions/setupActions'
import AuthCard from '@/features/auth/components/AuthCard'
import Btn from '@/shared/ui/Btn'

interface SetupStatus {
  configured: boolean
  reason?: string
  supabaseUrl: string | null
  projectRef: string | null
  sqlEditorUrl: string | null
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
        if (data?.database?.hasAdmin) {
          // If setup is already finished, offer redirect after brief delay
        }
      }
    } catch (err) {
      console.error('Failed to load setup status:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (formState?.ok && formState?.redirectTo) {
      router.push(formState.redirectTo)
    }
  }, [formState, router])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStatus()
  }

  if (loading) {
    return (
      <AuthCard title="Checking Environment..." icon="shield">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <Loader2 className="animate-spin text-accent" size={36} />
          <p className="text-sm text-foreground-muted">Probing Supabase instance & database status...</p>
        </div>
      </AuthCard>
    )
  }

  const isConfigured = status?.configured && status?.database?.connected
  const isSchemaReady = status?.database?.initialized
  const hasAdmin = status?.database?.hasAdmin

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <AuthCard
        title={hasAdmin ? 'Instance Ready' : isSchemaReady ? 'Create Root Admin' : 'Template Setup'}
        icon={hasAdmin ? 'shield' : isSchemaReady ? 'user' : 'key'}
      >
        {/* Subtitle / Description */}
        <p className="mb-6 text-sm text-foreground-muted text-center">
          {hasAdmin
            ? 'Your Audiobookphile instance is configured and initialized.'
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
                <Server size={15} className="text-foreground-muted shrink-0" />
              )}
              <span className="text-foreground-muted">Edge API:</span>
              <span className="text-foreground">{status?.edgeApi?.deployed ? 'Active (HTTP 200)' : 'PostgREST Direct'}</span>
            </div>
          </div>
        </div>

        {/* Step 1: Database Schema Required */}
        {!isSchemaReady && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">
              <h4 className="font-semibold text-amber-500 flex items-center gap-1.5 mb-1.5">
                <Database size={16} />
                <span>Initialize PostgreSQL Schema</span>
              </h4>
              <p className="text-xs text-foreground-muted leading-relaxed">
                Your Supabase instance is connected, but the Audiobookphile database tables and functions have not been
                loaded yet.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {status?.sqlEditorUrl && (
                <a
                  href={status.sqlEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-medium text-sm transition-all shadow-md shadow-accent/20"
                >
                  <ExternalLink size={16} />
                  <span>Open Supabase SQL Editor (1-Click)</span>
                </a>
              )}

              <div className="rounded-lg bg-surface-darker/60 border border-border/40 p-3 text-xs text-foreground-muted font-mono space-y-1.5">
                <p className="text-foreground font-sans font-semibold">How to initialize:</p>
                <p className="text-foreground-muted font-sans">
                  1. Copy the contents of <span className="text-accent font-mono">supabase/schema.sql</span> from this repository.
                </p>
                <p className="text-foreground-muted font-sans">
                  2. Paste into your Supabase Dashboard SQL Editor and click <strong className="text-foreground">Run</strong>.
                </p>
                <p className="text-foreground-muted font-sans">
                  Or via CLI: <span className="text-foreground font-mono">bun run supabase db push</span>
                </p>
              </div>

              <Btn
                color="bg-bg-light"
                size="medium"
                className="w-full border border-border flex items-center justify-center gap-2"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'Checking Schema...' : 'I have run the SQL — Check Again'}</span>
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
                  required
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-light/50 border border-border text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">Password (min 8 chars)</label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
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
                  <span>Create Owner Account & Enter</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 3: Already Initialized */}
        {hasAdmin && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 space-y-1">
              <Sparkles className="mx-auto" size={24} />
              <p className="font-semibold text-sm">Instance Initialized</p>
              <p className="text-xs text-foreground-muted">An administrator account is already configured.</p>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-medium text-sm transition-all shadow-md shadow-accent/20"
            >
              Proceed to Sign In &rarr;
            </Link>
          </div>
        )}
      </AuthCard>
    </div>
  )
}
