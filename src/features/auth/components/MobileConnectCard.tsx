'use client'

import { Check, Copy, ExternalLink, KeyRound, QrCode, Smartphone, Sparkles, User } from 'lucide-react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export interface MobileConnectCardProps {
  serverUrl?: string
  credentials?: {
    serverUrl?: string
    supabaseUrl?: string
    hasDemoAccount?: boolean
    demoAccount?: {
      username: string
      password: string
    }
    deepLink?: string
  }
  className?: string
  compact?: boolean
}

export default function MobileConnectCard({
  serverUrl,
  credentials,
  className = '',
  compact = false,
}: MobileConnectCardProps) {
  const [resolvedUrl, setResolvedUrl] = useState(serverUrl || '')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedUser, setCopiedUser] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)

  const demoUser = credentials?.demoAccount?.username || 'demo@audiobookphile.app'
  const demoPass = credentials?.demoAccount?.password || 'AudiobookphileDemo2026!'

  useEffect(() => {
    const url = serverUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://audiobookphile.app')
    setResolvedUrl(url)

    // Deep link protocol format parsed by iOS/Android client:
    // audiobookphile://connect?server=<url>&username=<user>&password=<pass>&autoLogin=1
    const deepLink =
      credentials?.deepLink ||
      `audiobookphile://connect?server=${encodeURIComponent(url)}&username=${encodeURIComponent(demoUser)}&password=${encodeURIComponent(demoPass)}&autoLogin=1`

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

  const deepLink =
    credentials?.deepLink ||
    `audiobookphile://connect?server=${encodeURIComponent(resolvedUrl)}&username=${encodeURIComponent(demoUser)}&password=${encodeURIComponent(demoPass)}&autoLogin=1`

  const copyText = (text: string, setter: (val: boolean) => void) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-zinc-900/40 p-6 backdrop-blur-xl shadow-glass transition-all duration-300 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="h-5 w-5 text-sky-400" />
        <h3 className="text-base font-bold text-foreground">Connect Audiobookphile Mobile App</h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-400 border border-sky-500/20">
          <Sparkles className="h-2.5 w-2.5" /> iOS &amp; Android
        </span>
      </div>

      <p className="text-xs text-foreground-muted mb-4">
        Scan this QR code with your phone camera or click below to automatically map this server and log into the native iOS or Android app.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-6">
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
        <div className="flex-1 w-full space-y-2.5">
          {/* Server URL */}
          <div>
            <label className="block text-[10px] font-medium text-foreground-muted mb-1 uppercase tracking-wider">
              Server Connection URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={resolvedUrl}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-mono text-sky-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyText(resolvedUrl, setCopiedUrl)}
                title="Copy Server URL"
                className="flex items-center justify-center h-7 w-7 shrink-0 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-foreground transition-colors"
              >
                {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-foreground-muted" />}
              </button>
            </div>
          </div>

          {/* Demo User & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="flex items-center gap-1 text-[10px] font-medium text-foreground-muted mb-1 uppercase tracking-wider">
                <User size={10} /> Demo Account
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={demoUser}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none truncate"
                />
                <button
                  type="button"
                  onClick={() => copyText(demoUser, setCopiedUser)}
                  title="Copy Demo Username"
                  className="flex items-center justify-center h-7 w-7 shrink-0 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-foreground transition-colors"
                >
                  {copiedUser ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-foreground-muted" />}
                </button>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1 text-[10px] font-medium text-foreground-muted mb-1 uppercase tracking-wider">
                <KeyRound size={10} /> Password
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={demoPass}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none truncate"
                />
                <button
                  type="button"
                  onClick={() => copyText(demoPass, setCopiedPass)}
                  title="Copy Demo Password"
                  className="flex items-center justify-center h-7 w-7 shrink-0 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-foreground transition-colors"
                >
                  {copiedPass ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-foreground-muted" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <a
              href={deepLink}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-sky-500/25 active:scale-[0.98]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>🚀 1-Click Launch &amp; Auto-Login Mobile App</span>
            </a>

            {!compact && (
              <p className="text-[10px] text-foreground-muted text-center pt-0.5">
                Deep link: <code className="text-sky-300 font-mono text-[9px]">audiobookphile://connect?server=...&amp;autoLogin=1</code>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
