import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | Audiobookphile',
  description: 'Terms of Service for Audiobookphile - Open-source, client-first media application for personal audiobooks.',
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6 sm:px-12 lg:px-24">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="border-b border-slate-800 pb-8">
          <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-sky-400 uppercase bg-sky-950/60 border border-sky-800/40 rounded-full">
            Legal Terms
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Audiobookphile Terms of Service
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Effective Date: August 12, 2026 &bull; Version 1.0
          </p>
        </header>

        <section className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 leading-relaxed">
          <p className="text-lg text-slate-200 font-medium leading-relaxed">
            By downloading, installing, or using the Audiobookphile application (across iOS, iPadOS, macOS, Android, or Web), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
          </p>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">1.</span> License &amp; Open-Source Architecture
            </h2>
            <p>
              Audiobookphile is free, open-source software provided under the MIT License. You are granted a limited, non-exclusive, revocable license to install and run the client software for personal, non-commercial use on compatible devices in accordance with these Terms.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">2.</span> Self-Hosted Media &amp; User Content
            </h2>
            <p>
              Audiobookphile is a client player designed to connect to self-hosted or user-designated media servers (such as Audiobookshelf or Supabase-backed storage). You retain full ownership and responsibility for the audio files, metadata, and media content you host, stream, or synchronize. You represent and warrant that you own or have obtained all necessary licenses, copyrights, and permissions for any content streamed through the app.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">3.</span> Account Deletion &amp; Data Rights
            </h2>
            <p>
              In accordance with Apple App Store Review Guidelines (Guideline 5.1.1(v)), Audiobookphile provides full in-app account deletion. Users may delete their account and permanently purge all associated metadata, progress, and preferences at any time directly from the Account screen or web settings.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">4.</span> Acceptable Use
            </h2>
            <p>
              You agree not to use Audiobookphile to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
              <li>Violate any applicable local, national, or international copyright laws or regulations.</li>
              <li>Circumvent digital rights management (DRM) or unauthorized access control systems.</li>
              <li>Interfere with, disrupt, or attack network services or servers connected to the application.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">5.</span> Disclaimer of Warranties &amp; Limitation of Liability
            </h2>
            <p>
              THE APPLICATION IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE,&rdquo; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF THE SOFTWARE.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">6.</span> Privacy Policy &amp; Inquiries
            </h2>
            <p>
              Your privacy is fundamental to our architecture. Please review our{' '}
              <Link href="/privacy" className="text-sky-400 hover:text-sky-300 underline underline-offset-4">
                Privacy Policy
              </Link>{' '}
              for details on how data is handled. For inquiries regarding these terms, contact us at{' '}
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@audiobookphile.app'}`}
                className="text-sky-400 hover:text-sky-300 underline underline-offset-4"
              >
                {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@audiobookphile.app'}
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
