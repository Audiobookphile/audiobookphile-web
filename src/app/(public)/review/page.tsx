import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'App Review Demonstration | Audiobookphile',
  description: 'App Review demonstration, typical user flow, credentials, and verification for Apple App Store Review.',
}

export default function AppReviewPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-16 px-6 sm:px-12 lg:px-24">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <header className="border-b border-slate-800 pb-8">
          <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-800/40 rounded-full">
            Apple App Review Resolution Hub
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Audiobookphile Demonstration
          </h1>
          <p className="mt-3 text-base text-slate-400">
            Official review documentation, typical user flow video, demo credentials, and licensing details for Guideline 2.1 completeness verification.
          </p>
        </header>

        {/* Video Demonstration Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📹</span> Physical Device / Simulator Video Walkthrough
          </h2>
          <p className="text-sm text-slate-400">
            Demonstrating app launch, 1-Click live demo authentication, library browsing, audio player controls, and the in-app account deletion workflow.
          </p>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl backdrop-blur-md">
            <video
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[540px] bg-black object-contain mx-auto"
            >
              <source src="/demo.mp4" type="video/mp4" />
              <track kind="captions" />
              Your browser does not support the video tag.
            </video>
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
              <span>Codec: H.264 / AAC • 720p HD</span>
              <a
                href="/demo.mp4"
                download
                className="text-sky-400 hover:text-sky-300 transition-colors font-medium"
              >
                Direct Download (MP4)
              </a>
            </div>
          </div>
        </section>

        {/* 6 Questions Resolution Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Account Management & Deletion */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              1. Account Management
            </div>
            <h3 className="text-lg font-bold text-white">In-App Account Deletion (5.1.1(v))</h3>
            <p className="text-sm text-slate-300">
              Users can permanently erase their account and all local/cloud data directly inside the app:
            </p>
            <ol className="text-xs text-slate-400 list-decimal list-inside space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <li>Tap Account icon (top right).</li>
              <li>Scroll to bottom to view destructive actions.</li>
              <li>Tap <strong className="text-rose-400">Delete Account</strong>.</li>
              <li>Confirm in native alert dialog to execute complete erasure.</li>
            </ol>
            <p className="text-xs text-emerald-400">
              ✓ The shared demo account is protected with automated state resets so testing does not break reviewer access.
            </p>
          </div>

          {/* 2. Login & Demo Access */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              2. Reviewer Access
            </div>
            <h3 className="text-lg font-bold text-white">1-Click Demo &amp; Credentials</h3>
            <p className="text-sm text-slate-300">
              Reviewers can tap the orange <strong className="text-amber-400">🚀 Try Live Demo (1-Click)</strong> button on the launch screen, or enter credentials manually:
            </p>
            <div className="text-xs font-mono bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5 text-slate-300">
              <div><span className="text-slate-500">Server:</span> https://audiobookphile.app</div>
              <div><span className="text-slate-500">Username:</span> demo@audiobookphile.app</div>
              <div><span className="text-slate-500">Password:</span> AudiobookphileDemo2026!</div>
            </div>
          </div>

          {/* 3. Purpose & Target Audience */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              3. Purpose &amp; Audience
            </div>
            <h3 className="text-lg font-bold text-white">Private Personal Audiobook Client</h3>
            <p className="text-sm text-slate-300">
              Audiobookphile provides a private, zero-tracking listening experience for users streaming audiobooks from self-hosted or cloud personal servers with full offline caching and native Liquid Glass SwiftUI design.
            </p>
            <p className="text-xs text-slate-400">
              Target Audience: Readers and audiobook enthusiasts who host their own public domain and DRM-free collections.
            </p>
          </div>

          {/* 4. External Services */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              4. External Services
            </div>
            <h3 className="text-lg font-bold text-white">Architecture &amp; SDK Transparency</h3>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li><strong>Database &amp; Auth:</strong> Supabase (PostgreSQL with Row Level Security)</li>
              <li><strong>Audio Storage:</strong> Backblaze B2 / Supabase Storage (S3-compatible)</li>
              <li><strong>Crash Diagnostics:</strong> Sentry Cocoa (Strict privacy; zero PII)</li>
              <li><strong>Zero Ad SDKs:</strong> No third-party marketing, analytics, or tracking trackers.</li>
            </ul>
          </div>

          {/* 5. Regional Consistency */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              5. Global Consistency
            </div>
            <h3 className="text-lg font-bold text-white">Worldwide Parity</h3>
            <p className="text-sm text-slate-300">
              The application operates identically across all geographic regions. There are no regional feature restrictions, paywalls, or geo-fenced content libraries.
            </p>
          </div>

          {/* 6. Content Rights & Licensing */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
            <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              6. Content Licensing
            </div>
            <h3 className="text-lg font-bold text-white">Public Domain Materials (LibriVox)</h3>
            <p className="text-sm text-slate-300">
              All demo media are public domain classics released under Creative Commons Zero / CC-PD:
            </p>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li><em>The Time Machine</em> by H. G. Wells</li>
              <li><em>The Adventures of Sherlock Holmes</em> by Sir Arthur Conan Doyle</li>
              <li><em>Frankenstein</em> by Mary Wollstonecraft Shelley</li>
              <li><em>The Art of War</em> by Sun Tzu</li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <p>© 2026 FOODSHARE CLUB LIMITED • Audiobookphile Open Source Project</p>
          <div className="flex justify-center gap-6 text-slate-400">
            <a href="https://github.com/Audiobookphile/audiobookphile-app" className="hover:text-white transition-colors">GitHub Repository</a>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
