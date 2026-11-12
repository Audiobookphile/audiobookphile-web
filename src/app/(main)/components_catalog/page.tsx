import { Bell, BookOpen, CheckSquare, ChevronRight, Info, Layout, MousePointer2 } from 'lucide-react'
import { CoverSizeWidgetExamples } from './examples/CoverSizeWidgetExamples'
import { EditListExamples } from './examples/EditListExamples'
import { SideBySideControlsExamples } from './examples/SideBySideControlsExamples'

export const dynamic = 'force-dynamic'

// See: https://nextjs.org/docs/app/guides/adopting-partial-prefetching

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export default function ComponentsCatalogPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-8">
      <div className="mb-12">
        <h1 className="mb-2 text-4xl font-black tracking-tighter text-white uppercase">Design System</h1>
        <p className="font-mono text-sm text-white/40">v2.0 Glassmorphic Modernization</p>
      </div>

      {/* Table of Contents */}
      <section className="mb-12">
        <h2 className="mb-8 text-xs font-black tracking-[0.3em] text-white/30 uppercase">System Components</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { href: '/components_catalog/items', label: 'Item Components', icon: BookOpen },
            { href: '/components_catalog/buttons', label: 'Button Components', icon: MousePointer2 },
            { href: '/components_catalog/icons', label: 'Icon & Indicator', icon: Info },
            { href: '/components_catalog/inputs', label: 'Input & Selection', icon: Layout },
            { href: '/components_catalog/modals', label: 'Modal Components', icon: Layout },
            { href: '/components_catalog/checkboxes', label: 'Checkbox & Switch', icon: CheckSquare },
            { href: '/components_catalog/alerts', label: 'Alert & Notification', icon: Bell },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md transition-all hover:scale-[1.02] hover:border-primary/50 active:scale-[0.98]"
            >
              <div className="rounded-xl bg-primary/20 p-3 transition-colors group-hover:bg-primary/30">
                <item.icon size={24} className="text-primary" />
              </div>
              <div className="grow">
                <p className="text-sm font-black tracking-widest text-white/90 uppercase">{item.label}</p>
              </div>
              <ChevronRight size={18} className="text-white/20 transition-colors group-hover:text-primary" />
            </a>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h3 className="mb-6 text-xs font-black tracking-widest text-white/30 uppercase">Misc. Examples</h3>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <li>
              <a
                href="#side-by-side-controls-components"
                className="text-sm font-black tracking-widest text-white/60 uppercase transition-colors hover:text-primary"
              >
                Side By Side Controls
              </a>
            </li>
            <li>
              <a
                href="#cover-size-widget-examples"
                className="text-sm font-black tracking-widest text-white/60 uppercase transition-colors hover:text-primary"
              >
                Cover Size Widget
              </a>
            </li>
            <li>
              <a
                href="#edit-list-examples"
                className="text-sm font-black tracking-widest text-white/60 uppercase transition-colors hover:text-primary"
              >
                Edit List
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div id="side-by-side-controls-components">
        <SideBySideControlsExamples />
      </div>
      <div id="cover-size-widget-examples">
        <CoverSizeWidgetExamples />
      </div>
      <div id="edit-list-examples">
        <EditListExamples />
      </div>
    </div>
  )
}
