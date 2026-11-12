import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support | Audiobookphile',
  description: 'Support and documentation for Audiobookphile - The open-source client for your audiobooks.',
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6 sm:px-12 lg:px-24">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="border-b border-slate-800 pb-8">
          <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-sky-400 uppercase bg-sky-950/60 border border-sky-800/40 rounded-full">
            Help &amp; Documentation
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Audiobookphile Support
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Assistance, guides, and contact information for Audiobookphile users.
          </p>
        </header>

        <section className="space-y-6 text-slate-300">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white">Connecting Your Server</h2>
            <p>
              Audiobookphile requires a server to stream and sync your media. On first launch, enter your Server URL (e.g. <code className="text-sky-300">https://audiobookphile.app</code>), your username, and your password.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white">Offline Downloads</h2>
            <p>
              To listen offline, tap any audiobook in your library and tap the Download button. Downloaded titles remain stored locally in your device&apos;s sandbox and will play seamlessly without an internet connection.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white">Need Further Assistance?</h2>
            <p>
              For bug reports, feature suggestions, or account help, email our support team directly at{' '}
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@audiobookphile.app'}`}
                className="text-sky-400 hover:text-sky-300 underline underline-offset-4"
              >
                {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@audiobookphile.app'}
              </a>{' '}
              or visit our{' '}
              <a
                href="https://github.com/Audiobookphile/audiobookphile-web/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline underline-offset-4"
              >
                open-source community tracker
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

