'use client'

import { Check, Copy, ExternalLink, QrCode, Smartphone, Sparkles } from 'lucide-react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

interface MobileConnectCardProps {
  serverUrl?: string
  className?: string
  compact?: boolean
}

export default function MobileConnectCard({ serverUrl, className = '', compact = false }: MobileConnectCardProps) {
  const [resolvedUrl, setResolvedUrl] = useState(serverUrl || '')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const url = serverUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://audiobookphile.app')
    setResolvedUrl(url)

    // Deep link protocol format parsed by iOS/Android client:
    // audiobookphile://connect?server=<encoded_server_url>
    const deepLink = `audiobookphile://connect?server=${encodeURIComponent(url)}`

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
  }, [serverUrl])

  const deepLink = `audiobookphile://connect?server=${encodeURIComponent(resolvedUrl)}`

  const copyToClipboard = () => {
    if (!resolvedUrl) return
    navigator.clipboard.writeText(resolvedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        Scan this QR code from your phone camera or tap the 1-click button to automatically map this server in the native mobile app.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* QR Code Container */}
        <div className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 p-2 shadow-inner">
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
        <div className="flex-1 w-full space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-foreground-muted mb-1 uppercase tracking-wider">
              Server Connection URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={resolvedUrl}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono text-sky-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                title="Copy Server URL"
                className="flex items-center justify-center h-8 w-8 shrink-0 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-foreground transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-foreground-muted" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <a
              href={deepLink}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs transition-all shadow-md shadow-sky-500/20 active:scale-[0.98]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Launch &amp; Map in iOS / Android App</span>
            </a>

            {!compact && (
              <p className="text-[11px] text-foreground-muted text-center pt-1">
                Deep link: <code className="text-sky-300 font-mono text-[10px]">audiobookphile://connect</code>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
