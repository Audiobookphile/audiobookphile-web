'use client'

import { Fingerprint, Lock, Smartphone, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { signInWithGoogle, signInWithMagicLink } from '@/features/auth/actions/authActions'
import AuthCard from '@/features/auth/components/AuthCard'
import { performPasskeyLogin, webAuthnErrorMessage } from '@/features/auth/lib/webauthn'
import { useFeatureFlag } from '@/shared/lib/analytics'
import Btn from '@/shared/ui/Btn'
import TextInput from '@/shared/ui/TextInput'
import { createClient } from '@/shared/utils/supabase/client'
import { getSupabaseAnonKey } from '@/shared/utils/supabase/env'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [magicSuccess, setMagicSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    fetch('/api/setup/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.database && data.database.hasAdmin === false) {
          setNeedsSetup(true)
        }
      })
      .catch(() => {})
  }, [])

  const [requires2FA, setRequires2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [userId, setUserId] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [enrolledMethods, setEnrolledMethods] = useState<{ totp?: boolean; pin?: boolean; biometric?: boolean }>({})
  const [activeTab, setActiveTab] = useState<'totp' | 'pin' | 'biometric'>('totp')

  const completeSession = useCallback(
    async (accessToken: string, refreshToken: string, defaultLibraryId?: string | null): Promise<boolean> => {
      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError) {
        setError(sessionError.message)
        setLoading(false)
        return false
      }

      const redirectUrl = searchParams.get('redirect')
      if (redirectUrl) {
        window.location.href = redirectUrl
        return true
      }

      if (defaultLibraryId) {
        window.location.href = `/library/${defaultLibraryId}`
        return true
      }

      try {
        const anonKey = getSupabaseAnonKey()
        const libsRes = await fetch('/api/libraries', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(anonKey ? { apikey: anonKey } : {}),
          },
        })
        if (libsRes.ok) {
          const libsData = await libsRes.json()
          if (libsData?.libraries?.length > 0) {
            window.location.href = `/library/${libsData.libraries[0].id}`
            return true
          }
        }
      } catch (err) {
        console.error('[LoginForm] Failed to fetch libraries:', err)
      }

      window.location.href = '/library'
      return true
    },
    [searchParams]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!email.trim()) {
        setError('Email or username is required.')
        setLoading(false)
        return
      }
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters.')
        setLoading(false)
        return
      }
      try {
        const anonKey = getSupabaseAnonKey()
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(anonKey ? { apikey: anonKey } : {}),
          },
          body: JSON.stringify({ username: email, password }),
        })

        const data = await res.json()

        if (!res.ok || data.error) {
          setError(data.error?.message || data.error || 'Login failed. Please check your credentials.')
          setLoading(false)
          return
        }

        if (data.requires2FA) {
          setRequires2FA(true)
          setTempToken(data.tempToken || '')
          setUserId(data.userId || '')
          // Fail closed: only treat methods the server explicitly reports as
          // enrolled. Never assume TOTP is set up when the payload is missing
          // or partial — otherwise a user with no configured method is asked
          // for a code they never created.
          const methods = data.methods || {}
          setEnrolledMethods(methods)
          if (methods.totp) setActiveTab('totp')
          else if (methods.pin) setActiveTab('pin')
          else if (methods.biometric) setActiveTab('biometric')
          setLoading(false)
          return
        }

        // Establish session with Supabase using returned tokens to set SSR cookies
        await completeSession(data.user.token, data.user.refreshToken, data.userDefaultLibraryId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[LoginForm] Network error:', message)
        setError('Unable to connect to authentication service. Please check your internet connection.')
        setLoading(false)
      }
    },
    [email, password, completeSession]
  )

  const handlePasskeySignIn = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const data = await performPasskeyLogin(userId, tempToken)
      await completeSession(data.user.token, data.user.refreshToken, data.userDefaultLibraryId)
    } catch (err) {
      console.error('[LoginForm] Passkey sign-in error:', err)
      setError(webAuthnErrorMessage(err))
      setLoading(false)
    }
  }, [userId, tempToken, completeSession])

  const handle2FASubmit = useCallback(
    async (e?: React.FormEvent, methodOverride?: 'totp' | 'pin' | 'biometric') => {
      if (e) e.preventDefault()
      const chosenMethod = methodOverride || activeTab

      if (chosenMethod === 'biometric') {
        await handlePasskeySignIn()
        return
      }

      const codeToSend = chosenMethod === 'pin' ? pinCode : totpCode

      if (!codeToSend) {
        setError('Please enter your verification code.')
        return
      }

      setError('')
      setLoading(true)
      try {
        const res = await fetch('/api/auth/2fa/verify-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tempToken, code: codeToSend, method: chosenMethod }),
        })

        const data = await res.json()

        if (!res.ok || data.error) {
          setError(data.error?.message || data.error || 'Invalid authentication code.')
          setLoading(false)
          return
        }

        await completeSession(data.user.token, data.user.refreshToken, data.userDefaultLibraryId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[LoginForm] 2FA verify network error:', message)
        setError('Unable to verify two-factor code. Please check your connection.')
        setLoading(false)
      }
    },
    [userId, tempToken, totpCode, pinCode, activeTab, handlePasskeySignIn, completeSession]
  )

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const res = await signInWithGoogle()
      if (res?.error) {
        setError(res.error)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || 'Failed to sign in with Google.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleMagicLinkSignIn = async () => {
    if (!email) {
      setError('Please enter your email address above to receive a magic link.')
      return
    }
    setError('')
    setMagicSuccess('')
    setMagicLoading(true)
    try {
      const res = await signInWithMagicLink(email)
      if (res?.error) {
        setError(res.error)
      } else if (res?.success) {
        setMagicSuccess('Magic link sent! Check your email.')
      } else {
        setError('Unexpected response. Please try again.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[LoginForm] Magic link error:', message)
      setError(message || 'Failed to send magic link. Please try again.')
    } finally {
      setMagicLoading(false)
    }
  }

  // Kill-switch flag: WebAuthn/passkey flows are gated so a browser quirk can
  // disable biometric 2FA instantly from PostHog without a deploy. Default ON.
  const passkey2FAEnabled = useFeatureFlag('passkey_2fa', true)

  // Magic-link / recovery emails whose redirect_to isn't on the Supabase
  // allow-list (e.g. path-scoped targets, localhost) are redirected by GoTrue
  // to the Site URL root with the session tokens in the URL fragment. `/`
  // redirects here, the fragment survives, and no server route can read it —
  // so complete the sign-in from the hash exactly like /auth/confirm does.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) return
    const type = params.get('type')
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    if (type === 'recovery') {
      const supabase = createClient()
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => router.replace('/reset-password'))
      return
    }
    void completeSession(accessToken, refreshToken)
  }, [completeSession, router])

  useEffect(() => {
    if (!passkey2FAEnabled && activeTab === 'biometric') {
      setActiveTab('totp')
    }
  }, [passkey2FAEnabled, activeTab])

  const hasEnrolledMethods = Boolean(enrolledMethods.totp || enrolledMethods.pin || enrolledMethods.biometric)
  const methodTabs = [
    ...(passkey2FAEnabled
      ? [
          {
            key: 'biometric' as const,
            label: 'Biometric',
            icon: Fingerprint,
            enrolled: enrolledMethods.biometric === true,
          },
        ]
      : []),
    { key: 'pin' as const, label: 'PIN Code', icon: Lock, enrolled: enrolledMethods.pin === true },
    { key: 'totp' as const, label: 'TOTP', icon: Smartphone, enrolled: enrolledMethods.totp === true },
  ]

  if (requires2FA) {
    return (
      <AuthCard title="Two-Factor Authentication" onSubmit={handle2FASubmit}>
        {methodTabs.length > 1 && (
          <div className="bg-bg-dark/50 mb-6 flex rounded-xl border border-border p-1">
            {methodTabs.map(({ key, label, icon: TabIcon, enrolled }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key)
                  setError('')
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === key ? 'bg-accent text-white shadow-sm' : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {label}
                {!enrolled && <span className="ml-0.5 text-[10px] font-normal opacity-75">Set up</span>}
              </button>
            ))}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4">
          {!hasEnrolledMethods && (
            <div className="bg-bg-light/30 flex flex-col gap-3 rounded-xl border border-border p-4 text-center">
              <p className="text-sm text-foreground-muted">
                No two-factor methods are configured for this account, so no verification code can be requested.
              </p>
              <p className="text-xs text-foreground-muted">
                Please contact an administrator to reconfigure your security settings.
              </p>
            </div>
          )}

          {activeTab === 'biometric' && enrolledMethods.biometric && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-inner">
                <Fingerprint className="h-9 w-9 animate-pulse" />
              </div>
              <p className="text-sm text-foreground-muted">
                Verify your identity using Face ID, Touch ID, or security key.
              </p>
              <Btn
                type="button"
                onClick={() => handle2FASubmit(undefined, 'biometric')}
                loading={loading}
                className="w-full py-3"
              >
                Authenticate with Facial 2FA / Passkey
              </Btn>
            </div>
          )}

          {activeTab === 'biometric' && !enrolledMethods.biometric && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="text-sm text-foreground-muted">Biometric 2FA is not set up yet.</p>
              <Btn type="button" onClick={() => router.push('/settings/security')} className="w-full">
                Enable Biometric in Settings
              </Btn>
            </div>
          )}

          {activeTab === 'pin' && enrolledMethods.pin && (
            <div>
              <p className="mb-4 text-center text-sm text-foreground-muted">
                Enter your 4-8 digit security PIN code to sign in.
              </p>
              <TextInput
                label="PIN Code"
                value={pinCode}
                type="password"
                placeholder="••••••••"
                onChange={setPinCode}
              />
            </div>
          )}

          {activeTab === 'pin' && !enrolledMethods.pin && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-foreground-muted">A PIN code is not set up yet.</p>
            </div>
          )}

          {activeTab === 'totp' && enrolledMethods.totp && (
            <div>
              <p className="mb-4 text-center text-sm text-foreground-muted">
                Enter the 6-digit verification code from your authenticator app to finish signing in.
              </p>
              <TextInput
                label="6-Digit Verification Code"
                value={totpCode}
                type="text"
                autocomplete="one-time-code"
                placeholder="000000"
                onChange={setTotpCode}
              />
            </div>
          )}
        </div>

        {error && <div className="mb-4 text-center text-sm text-red-400">{error}</div>}

        <div className="flex flex-col gap-3">
          {activeTab !== 'biometric' && enrolledMethods[activeTab] && (
            <Btn type="submit" loading={loading} className="w-full">
              Verify & Sign in
            </Btn>
          )}
          <button
            type="button"
            onClick={() => {
              setRequires2FA(false)
              setTotpCode('')
              setPinCode('')
              setError('')
            }}
            className="text-center text-xs text-foreground-muted hover:text-foreground hover:underline"
          >
            Back to Login
          </button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Login" onSubmit={handleSubmit}>
      {needsSetup && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs text-foreground">
          <span>First-time deployer? No administrator configured yet.</span>
          <Link href="/setup" className="font-semibold text-accent hover:underline whitespace-nowrap">
            Setup &rarr;
          </Link>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-foreground">
        <span className="flex items-center gap-1.5 text-sky-400">
          <Sparkles size={14} className="shrink-0" />
          <span>Evaluating Audiobookphile?</span>
        </span>
        <a
          href="https://audiobookphile.app"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-4 whitespace-nowrap"
        >
          Explore Live Demo &rarr;
        </a>
      </div>
      <div className="mb-4 flex flex-col gap-4">
        <TextInput label="Email" value={email} type="email" autocomplete="email" onChange={setEmail} />
        <TextInput
          label="Password"
          value={password}
          type="password"
          autocomplete="current-password"
          onChange={setPassword}
        />
      </div>

      <div className="mb-4 flex justify-end">
        <Link href="/forgot-password" className="text-sm text-accent hover:underline">
          Forgot password?
        </Link>
      </div>

      {error && <div className="mb-4 text-center text-sm text-red-400">{error}</div>}
      {magicSuccess && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-center text-sm text-green-400">
          {magicSuccess}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Btn type="submit" loading={loading} className="w-full">
          Sign in
        </Btn>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-bg px-2 text-foreground">Or continue with</span>
          </div>
        </div>

        <div
          className={process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true' ? 'grid grid-cols-2 gap-3' : 'flex flex-col'}
        >
          <Btn
            type="button"
            color="bg-bg-light"
            className="flex w-full items-center justify-center gap-2 border border-border"
            loading={magicLoading}
            onClick={handleMagicLinkSignIn}
          >
            <svg
              className="h-4 w-4 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
              />
            </svg>
            Magic Link
          </Btn>

          {process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true' && (
            <Btn
              type="button"
              color="bg-bg-light"
              className="flex w-full items-center justify-center gap-2 border border-border"
              loading={googleLoading}
              onClick={handleGoogleSignIn}
            >
              <svg className="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                />
              </svg>
              Google
            </Btn>
          )}
        </div>

        <p className="text-center text-xs text-foreground-muted">
          Registration is invitation-only. Please contact an administrator for access.
        </p>
      </div>
    </AuthCard>
  )
}
