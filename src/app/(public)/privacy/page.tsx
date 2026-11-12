import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Audiobookphile',
  description: 'Audiobookphile Privacy Policy - Transparent, zero-tracking, privacy-first audiobook streaming client.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6 sm:px-12 lg:px-24">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="border-b border-slate-800 pb-8">
          <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-800/40 rounded-full">
            Privacy First
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Audiobookphile Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Effective Date: August 12, 2026 &bull; Version 1.0
          </p>
        </header>

        <section className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 leading-relaxed">
          <p className="text-lg text-slate-200 font-medium leading-relaxed">
            Audiobookphile is an open-source, client-first media application built for Apple devices and web browsers. We believe your personal library, listening history, and reading habits are your private property.
          </p>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">1.</span> Zero Personal Data Collection
            </h2>
            <p>
              <strong>We collect no personal data.</strong> Audiobookphile does not contain third-party tracking APIs, behavioral advertising trackers, data brokers, or marketing profiling tools. We do not sell, rent, or monetize your listening habits, IP addresses, or device identifiers.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">2.</span> Direct Server Communication
            </h2>
            <p>
              Audiobookphile connects exclusively and directly to the server URL that you configure (e.g. your self-hosted server or designated backend). Your authentication tokens, media requests, playback progress, and bookmarks are transmitted directly between your device and your server. No intermediary proxy intercepts or records your data.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">3.</span> Local Storage &amp; Secure Keychain
            </h2>
            <p>
              To maintain offline playback, resume positions, and active sessions, Audiobookphile stores configuration settings and security tokens locally on your device using Apple&apos;s standard encrypted <code className="text-emerald-300">UserDefaults</code> and <code className="text-emerald-300">Keychain</code> services. This data remains on your device and is never uploaded to any central registry.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">4.</span> Crash Diagnostics (Opt-Out)
            </h2>
            <p>
              To maintain stability across iOS and iPadOS releases, Audiobookphile may transmit anonymous crash traces to an error reporting service (Sentry). These reports include stack traces, OS versions, and hardware architecture. They never contain library contents, audiobook titles, or user credentials. Crash diagnostics can be toggled off at any time in Settings.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">5.</span> Open Source Verification &amp; Contact
            </h2>
            <p>
              Our code is transparent and auditable. If you have questions about this policy or security practices, reach out on our official repository or contact the project team at{' '}
              <a
                href="mailto:organicnz2@gmail.com"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
              >
                organicnz2@gmail.com
              </a>.
            </p>
          </div>
        </section>

        <footer className="pt-8 border-t border-slate-900 text-xs text-slate-500 text-center">
          &copy; {new Date().getFullYear()} Audiobookphile. All rights reserved.
        </footer>
      </div>
    </main>
  )
}

