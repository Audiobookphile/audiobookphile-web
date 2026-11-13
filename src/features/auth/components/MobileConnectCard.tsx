'use client'

import { Check, Copy, ExternalLink, KeyRound, Loader2, Mail, QrCode, Send, Smartphone, Sparkles, User } from 'lucide-react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { sendMobileConnectEmailAction } from '@/features/auth/actions/setupActions'

export interface MobileConnectCardProps {
  serverUrl?: string
  defaultEmail?: string
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
  className?: string
  compact?: boolean
}

/**
 * Build the deep link the mobile app understands. Credentials are only added
 * when they exist: on a private deployment there is no demo account, and
 * embedding made-up credentials would send the phone into a failing login.
 */
function buildDeepLink(serverUrl: string, username: string | null, password: string | null): string {
  const params = new URLSearchParams({ server: serverUrl })
  if (username && password) {
    params.set('username', username)
    params.set('password', password)
    params.set('autoLogin', '1')
  }
  return `audiobookphile://connect?${params.toString()}`
}

export default function MobileConnectCard({
  serverUrl,
  defaultEmail,
  credentials,
  className = '',
  compact = false,
}: MobileConnectCardProps) {
  const [resolvedUrl, setResolvedUrl] = useState(serverUrl || '')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedUser, setCopiedUser] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)
  const [targetEmail, setTargetEmail] = useState(defaultEmail || '')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; message: string } | null>(null)

  const demoUser = credentials?.demoAccount?.username ?? null
  const demoPass = credentials?.demoAccount?.password ?? null
  const hasDemoCredentials = Boolean(demoUser && demoPass)

  useEffect(() => {
    const url = serverUrl || (typeof window !== 'undefined' ? window.location.origin : '')
    setResolvedUrl(url)

    if (!url) {
      setQrCodeDataUrl(null)
      return
    }

    const deepLink = credentials?.deepLink || buildDeepLink(url, demoUser, demoPass)

    QRCode.toDataURL(deepLink, {
      width: 256,
      margin: 2,
      color: {
        dark: '#ffffff',
        light: '#00000000', // transparent background
      },
    })
      .then(setQrCodeDataUrl)
      .catch((err) => console.error('Failed to generate QR code:', err))
  }, [serverUrl, credentials?.deepLink, demoUser, demoPass])

  const deepLink = credentials?.deepLink || buildDeepLink(resolvedUrl, demoUser, demoPass)

  const copyText = (text: string, setter: (val: boolean) => void) => {
    if (!text) return
    void navigator.clipboard.writeText(text).catch((err) => console.error('Failed to copy to clipboard:', err))
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = targetEmail.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setEmailStatus({ ok: false, message: 'Please enter a valid email address.' })
      return
    }

    setSendingEmail(true)
    setEmailStatus(null)
    try {
      const result = await sendMobileConnectEmailAction(trimmed, hasDemoCredentials, resolvedUrl)
      setEmailStatus({
        ok: result.ok,
        message:
          result.message ||
          (result.ok ? 'Connection link sent! Check your phone inbox.' : 'Failed to send email.'),
      })
    } catch (err) {
      setEmailStatus({
        ok: false,
        message: err instanceof Error ? err.message : 'Error dispatching email.',
      })
    } finally {
      setSendingEmail(false)
    }
  }

  // Without a server URL there is nothing to connect a phone to.
  if (!resolvedUrl) return null

  return (
    <div
      className={`shadow-glass relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-300 dark:border-white/5 dark:bg-zinc-900/40 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-sky-400" />
        <h3 className="text-base font-bold text-foreground">Connect Audiobookphile Mobile App</h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-400">
          <Sparkles className="h-2.5 w-2.5" /> iOS &amp; Android
        </span>
      </div>

      <p className="mb-4 text-xs text-foreground-muted">
        Scan this QR code with your phone camera or click below to automatically map this server
        {hasDemoCredentials ? ' and log into the native iOS or Android app.' : ' in the native iOS or Android app.'}
      </p>

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        {/* QR Code Container */}
        <div className="relative flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 p-2 shadow-inner">
          {qrCodeDataUrl ? (
            <Image
              src={qrCodeDataUrl}
              alt="Scan to Connect Audiobookphile Mobile App"
              width={160}
              height={160}
              className="h-full w-full object-contain"
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-foreground-muted">
              <QrCode className="h-8 w-8 animate-pulse" />
              <span className="text-[10px]">Generating QR...</span>
            </div>
          )}
        </div>

        {/* Credentials & 1-Click Launch */}
        <div className="w-full flex-1 space-y-2.5">
          {/* Server URL */}
          <div>
            <label className="mb-1 block text-[10px] font-medium tracking-wider text-foreground-muted uppercase">
              Server Connection URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={resolvedUrl}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-xs text-sky-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyText(resolvedUrl, setCopiedUrl)}
                title="Copy Server URL"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground transition-colors hover:bg-white/10"
              >
                {copiedUrl ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-foreground-muted" />
                )}
              </button>
            </div>
          </div>

          {/* Demo User & Password — only present on the official demo backend */}
          {hasDemoCredentials && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1 text-[10px] font-medium tracking-wider text-foreground-muted uppercase">
                  <User size={10} /> Demo Account
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={demoUser ?? ''}
                    className="w-full truncate rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyText(demoUser ?? '', setCopiedUser)}
                    title="Copy Demo Username"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground transition-colors hover:bg-white/10"
                  >
                    {copiedUser ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-foreground-muted" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-[10px] font-medium tracking-wider text-foreground-muted uppercase">
                  <KeyRound size={10} /> Password
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={demoPass ?? ''}
                    className="w-full truncate rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyText(demoPass ?? '', setCopiedPass)}
                    title="Copy Demo Password"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground transition-colors hover:bg-white/10"
                  >
                    {copiedPass ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-foreground-muted" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 pt-1">
            <a
              href={deepLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-sky-500/25 transition-all hover:from-sky-400 hover:to-indigo-500 active:scale-[0.98]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>
                {hasDemoCredentials ? '🚀 1-Click Launch & Auto-Login Mobile App' : '🚀 1-Click Launch Mobile App'}
              </span>
            </a>

            {!compact && (
              <p className="pt-0.5 text-center text-[10px] text-foreground-muted">
                Deep link:{' '}
                <code className="font-mono text-[9px] text-sky-300">
                  audiobookphile://connect?server=...&amp;autoLogin=1
                </code>
              </p>
            )}
          </div>

          {/* Email iOS Connection Link to Phone */}
          <div className="border-t border-white/10 pt-3 dark:border-white/5">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <Mail className="h-3.5 w-3.5 text-sky-400" />
              <span>Email iOS Setup Link to Phone</span>
            </label>
            <form onSubmit={handleSendEmail} className="flex gap-2">
              <input
                type="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-foreground placeholder:text-foreground-muted/50 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={sendingEmail}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-sky-400 active:scale-[0.98] disabled:opacity-50"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
            {emailStatus && (
              <p className={`mt-1.5 text-[11px] leading-tight ${emailStatus.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                {emailStatus.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
