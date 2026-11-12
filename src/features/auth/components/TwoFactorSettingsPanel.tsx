'use client'

import {
  Check,
  Copy,
  Fingerprint,
  Key,
  Lock,
  QrCode,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { performPasskeyRegistration, removePasskey, webAuthnErrorMessage } from '@/features/auth/lib/webauthn'
import Btn from '@/shared/ui/Btn'
import TextInput from '@/shared/ui/TextInput'
import { createClient } from '@/shared/utils/supabase/client'

interface TwoFactorSettingsPanelProps {
  initialEnabled?: boolean
}

interface PasskeyInfo {
  id: string
  credentialId: string
  deviceName?: string
  createdAt?: string
  lastUsedAt?: string
}

interface Auth2FAStatus {
  enabled: boolean
  totpEnrolled?: boolean
  pinEnrolled?: boolean
  biometricEnrolled?: boolean
  methods?: string[]
  passkeys?: PasskeyInfo[]
}

export default function TwoFactorSettingsPanel({ initialEnabled = false }: TwoFactorSettingsPanelProps) {
  const [status, setStatus] = useState<Auth2FAStatus>({ enabled: initialEnabled })
  const [mode, setMode] = useState<'idle' | 'enrollingTotp' | 'enrollingPin' | 'disabling'>('idle')
  const [secret, setSecret] = useState('')
  const [uri, setUri] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [disablePin, setDisablePin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return

      const res = await fetch('/api/auth/2fa/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data: Auth2FAStatus = await res.json()
        setStatus(data)
      }
    } catch {
      // Ignore network error on status fetch
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const handleCopySecret = useCallback(async () => {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard error
    }
  }, [secret])

  const handleStartEnrollTotp = useCallback(async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setError('Your session has expired. Please log in again.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/auth/2fa/enroll', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to start 2FA setup.')
        setLoading(false)
        return
      }

      setSecret(data.secret || '')
      setUri(data.uri || '')
      setVerificationCode('')
      setMode('enrollingTotp')
    } catch {
      setError('Unable to reach server. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleVerifyEnrollTotp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!verificationCode || verificationCode.trim().length !== 6) {
        setError('Please enter a valid 6-digit verification code.')
        return
      }

      setError('')
      setSuccess('')
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setError('Your session has expired. Please log in again.')
          setLoading(false)
          return
        }

        const res = await fetch('/api/auth/2fa/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: verificationCode.trim() }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || 'Invalid verification code. Try again with a new code.')
          setLoading(false)
          return
        }

        setStatus((prev) => ({ ...prev, enabled: true, totpEnrolled: true }))
        setMode('idle')
        setSecret('')
        setUri('')
        setVerificationCode('')
        setSuccess('Authenticator app 2FA has been successfully enabled for your account.')
      } catch {
        setError('Unable to verify two-factor code. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [verificationCode]
  )

  const handleEnrollPin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const cleaned = pinInput.trim()
      if (cleaned.length < 4 || cleaned.length > 8 || !/^\d+$/.test(cleaned)) {
        setError('PIN code must be between 4 and 8 digits.')
        return
      }

      setError('')
      setSuccess('')
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setError('Your session has expired. Please log in again.')
          setLoading(false)
          return
        }

        const res = await fetch('/api/auth/2fa/enroll-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pinCode: cleaned }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to enroll PIN code.')
          setLoading(false)
          return
        }

        setStatus((prev) => ({ ...prev, enabled: true, pinEnrolled: true }))
        setMode('idle')
        setPinInput('')
        setSuccess('PIN code sign-in has been successfully enabled.')
      } catch {
        setError('Unable to save PIN code. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [pinInput]
  )

  const handleEnrollBiometric = useCallback(async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token || ''
      if (!token) {
        setError('Your session has expired. Please log in again.')
        setLoading(false)
        return
      }

      const existingIds = (status.passkeys || []).map((pk) => pk.credentialId)
      const result = await performPasskeyRegistration(token, {
        deviceName: 'Web Browser',
        existingCredentialIds: existingIds,
      })

      if (!result.success) {
        setError('Passkey registration failed.')
        setLoading(false)
        return
      }

      setStatus((prev) => ({ ...prev, enabled: true, biometricEnrolled: true }))
      await fetchStatus()
      setSuccess('Facial 2FA / Biometric passkey has been successfully enabled for this device.')
    } catch (err) {
      console.error('[TwoFactorSettingsPanel] Passkey enrollment error:', err)
      setError(webAuthnErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [status.passkeys, fetchStatus])

  const handleRemovePasskey = useCallback(
    async (credentialId: string) => {
      setError('')
      setSuccess('')
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setError('Your session has expired. Please log in again.')
          setLoading(false)
          return
        }

        await removePasskey(token, credentialId)
        await fetchStatus()
        setSuccess('Passkey has been removed from your account.')
      } catch (err) {
        console.error('[TwoFactorSettingsPanel] Passkey removal error:', err)
        setError(err instanceof Error ? err.message : 'Failed to remove passkey.')
      } finally {
        setLoading(false)
      }
    },
    [fetchStatus]
  )

  const handleDisable2FA = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setSuccess('')
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setError('Your session has expired. Please log in again.')
          setLoading(false)
          return
        }

        const res = await fetch('/api/auth/2fa/disable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code: disableCode.trim() || undefined,
            pinCode: disablePin.trim() || undefined,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to disable two-factor authentication.')
          setLoading(false)
          return
        }

        setStatus({
          enabled: false,
          totpEnrolled: false,
          pinEnrolled: false,
          biometricEnrolled: false,
          methods: [],
          passkeys: [],
        })
        setMode('idle')
        setDisableCode('')
        setDisablePin('')
        setSuccess('All two-factor authentication methods have been disabled.')
      } catch {
        setError('Unable to disable two-factor authentication. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [disableCode, disablePin]
  )

  const isAnyEnabled = status.enabled || status.totpEnrolled || status.pinEnrolled || status.biometricEnrolled

  return (
    <div className="bg-bg-light/80 rounded-2xl border border-border p-6 shadow-xl backdrop-blur-md transition-all">
      <div className="flex flex-col justify-between gap-4 border-b border-border/50 pb-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-inner">
            {isAnyEnabled ? <ShieldCheck className="h-6 w-6 text-emerald-400" /> : <Shield className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">Multi-Factor Authentication (2FA)</h3>
            <p className="text-xs text-foreground-muted">
              Secure your account with Authenticator Apps, PIN Codes, or Facial/Biometric passkeys.
            </p>
          </div>
        </div>

        <div>
          {isAnyEnabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Disabled
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="my-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">{error}</div>
      )}

      {success && (
        <div className="my-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          {success}
        </div>
      )}

      {mode === 'idle' && (
        <div className="mt-5 space-y-6">
          <p className="text-sm leading-relaxed text-foreground-muted">
            Choose one or more authentication methods below. Any enrolled method can be used during sign-in as a single
            source of truth verification.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Authenticator App */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-bg/50 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-accent" />
                  <h4 className="text-sm font-semibold text-foreground">Authenticator App</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-foreground-muted">
                  Generate 6-digit verification codes using Google Authenticator, 1Password, or Authy.
                </p>
              </div>
              <div className="mt-4">
                {status.totpEnrolled ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                    <Check className="h-3 w-3" /> Enrolled
                  </span>
                ) : (
                  <Btn onClick={handleStartEnrollTotp} loading={loading} className="w-full py-2 text-xs">
                    Set Up TOTP
                  </Btn>
                )}
              </div>
            </div>

            {/* PIN Code Sign-In */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-bg/50 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-accent" />
                  <h4 className="text-sm font-semibold text-foreground">PIN Code Sign-In</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-foreground-muted">
                  Set a secure 4 to 8 digit numerical PIN code as an authentication factor.
                </p>
              </div>
              <div className="mt-4">
                {status.pinEnrolled ? (
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                      <Check className="h-3 w-3" /> Enrolled
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setError('')
                        setSuccess('')
                        setPinInput('')
                        setMode('enrollingPin')
                      }}
                      className="text-xs text-accent hover:underline"
                    >
                      Update
                    </button>
                  </div>
                ) : (
                  <Btn
                    onClick={() => {
                      setError('')
                      setSuccess('')
                      setPinInput('')
                      setMode('enrollingPin')
                    }}
                    className="w-full py-2 text-xs"
                  >
                    Set Up PIN
                  </Btn>
                )}
              </div>
            </div>

            {/* Facial 2FA / Biometric */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-bg/50 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-5 w-5 text-accent" />
                  <h4 className="text-sm font-semibold text-foreground">Facial 2FA / Biometric</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-foreground-muted">
                  Sign in instantly with Face ID, Touch ID, or hardware security keys.
                </p>
              </div>
              <div className="mt-4">
                {status.biometricEnrolled ? (
                  <div className="space-y-2">
                    {(status.passkeys || []).length === 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <ul className="space-y-2">
                        {status.passkeys!.map((passkey) => (
                          <li
                            key={passkey.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg/60 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-foreground">
                                {passkey.deviceName || 'Passkey'}
                              </p>
                              <p className="text-[10px] text-foreground-muted">
                                {passkey.createdAt
                                  ? `Registered ${new Date(passkey.createdAt).toLocaleDateString()}`
                                  : 'Registered'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePasskey(passkey.credentialId)}
                              disabled={loading}
                              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:text-red-400 disabled:opacity-50"
                              title={`Remove ${passkey.deviceName || 'passkey'}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Btn onClick={handleEnrollBiometric} loading={loading} className="w-full py-2 text-xs">
                      Add Another Passkey
                    </Btn>
                  </div>
                ) : (
                  <Btn onClick={handleEnrollBiometric} loading={loading} className="w-full py-2 text-xs">
                    Enable Facial 2FA
                  </Btn>
                )}
              </div>
            </div>
          </div>

          {isAnyEnabled && (
            <div className="pt-2">
              <Btn
                onClick={() => {
                  setError('')
                  setSuccess('')
                  setMode('disabling')
                }}
                color="bg-red-600/80 hover:bg-red-600"
                className="px-5 py-2.5 text-xs"
              >
                Disable All 2FA Methods
              </Btn>
            </div>
          )}
        </div>
      )}

      {mode === 'enrollingTotp' && (
        <form onSubmit={handleVerifyEnrollTotp} className="mt-6 space-y-6">
          <div className="space-y-4 rounded-xl border border-border bg-bg/60 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Key className="h-4 w-4 text-accent" />
              1. Add secret key to your authenticator app
            </h4>
            <p className="text-xs leading-relaxed text-foreground-muted">
              Open your authenticator app and choose <strong>Add Account via Secret Key</strong>, or copy the URI below.
            </p>

            <div className="flex items-center gap-2">
              <code className="bg-bg-dark/80 flex-1 overflow-x-auto rounded-lg border border-border px-3 py-2 font-mono text-xs tracking-wider text-accent select-all">
                {secret}
              </code>
              <button
                type="button"
                onClick={handleCopySecret}
                className="bg-bg-light flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-border"
                title="Copy Secret"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {uri && (
              <div className="pt-2">
                <p className="font-mono text-[11px] break-all text-foreground-muted opacity-70">{uri}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <QrCode className="h-4 w-4 text-accent" />
              2. Enter the 6-digit verification code
            </h4>
            <div className="max-w-xs">
              <TextInput
                label="Verification Code"
                value={verificationCode}
                type="text"
                autocomplete="one-time-code"
                placeholder="000000"
                onChange={setVerificationCode}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Btn type="submit" loading={loading} className="px-6 py-2.5">
              Verify & Activate TOTP
            </Btn>
            <button
              type="button"
              onClick={() => {
                setMode('idle')
                setError('')
              }}
              className="px-3 py-2 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === 'enrollingPin' && (
        <form onSubmit={handleEnrollPin} className="mt-6 space-y-5">
          <div className="space-y-3 rounded-xl border border-border bg-bg/60 p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lock className="h-4 w-4 text-accent" />
              Set Up PIN Code Authentication
            </h4>
            <p className="text-xs leading-relaxed text-foreground-muted">
              Enter a 4 to 8 digit numerical PIN code. You can use this PIN as an alternative during two-factor
              authentication sign-in.
            </p>
          </div>

          <div className="max-w-xs">
            <TextInput
              label="4-8 Digit PIN Code"
              value={pinInput}
              type="password"
              placeholder="••••••••"
              onChange={setPinInput}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Btn type="submit" loading={loading} className="px-6 py-2.5">
              Save PIN Code
            </Btn>
            <button
              type="button"
              onClick={() => {
                setMode('idle')
                setError('')
                setPinInput('')
              }}
              className="px-3 py-2 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === 'disabling' && (
        <form onSubmit={handleDisable2FA} className="mt-6 space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-200/90">
              Disabling multi-factor authentication will remove all enrolled authentication methods from your account.
            </p>
          </div>

          <div className="max-w-xs space-y-4">
            <TextInput
              label="Enter 6-digit authenticator code (optional)"
              value={disableCode}
              type="text"
              autocomplete="one-time-code"
              placeholder="000000"
              onChange={setDisableCode}
            />
            <TextInput
              label="Enter your PIN code (optional)"
              value={disablePin}
              type="password"
              autocomplete="current-password"
              placeholder="••••"
              onChange={setDisablePin}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Btn type="submit" loading={loading} color="bg-red-600/80 hover:bg-red-600" className="px-6 py-2.5">
              Confirm Disable All
            </Btn>
            <button
              type="button"
              onClick={() => {
                setMode('idle')
                setError('')
              }}
              className="px-3 py-2 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
