import {
  ArrowLeft,
  BarChart3,
  Bell,
  Database,
  FileText,
  Headphones,
  Key,
  Library,
  Mail,
  Rss,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/shared/contexts/UserContext'
import { mergeClasses } from '@/shared/lib/merge-classes'

interface SideNavContentProps {
  handleItemClick?: () => void
  serverVersion: string
  installSource: string
}

interface NavGroup {
  title: string
  items: {
    label: string
    href: string
    icon: React.ReactNode
  }[]
}

export default function SideNavContent({ handleItemClick, serverVersion, installSource }: SideNavContentProps) {
  const pathname = usePathname()
  const userContext = useUser()
  const isAdminOrRoot = ['admin', 'root'].includes(userContext?.user?.type ?? '')

  // Non-admins may only access their own account security settings.
  // Everything else in /settings is admin/root-only (enforced in proxy).
  const userAccessibleHrefs = new Set(['/settings/authentication'])

  const groups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { label: 'General Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> },
        { label: 'Analytics', href: '/settings/analytics', icon: <BarChart3 className="h-4 w-4" /> },
      ],
    },
    {
      title: 'Catalog & Libraries',
      items: [
        { label: 'Libraries', href: '/settings/libraries', icon: <Library className="h-4 w-4" /> },
        { label: 'Item Metadata Utils', href: '/settings/item-metadata-utils', icon: <Wrench className="h-4 w-4" /> },
        { label: 'RSS Feeds', href: '/settings/rss-feeds', icon: <Rss className="h-4 w-4" /> },
      ],
    },
    {
      title: 'Users & Security',
      items: [
        { label: 'Users', href: '/settings/users', icon: <Users className="h-4 w-4" /> },
        { label: 'Authentication & 2FA', href: '/settings/authentication', icon: <ShieldCheck className="h-4 w-4" /> },
        { label: 'API Keys', href: '/settings/api-keys', icon: <Key className="h-4 w-4" /> },
      ],
    },
    {
      title: 'System & Logs',
      items: [
        { label: 'Listening Sessions', href: '/settings/listening-sessions', icon: <Headphones className="h-4 w-4" /> },
        { label: 'Backups', href: '/settings/backups', icon: <Database className="h-4 w-4" /> },
        { label: 'Logs', href: '/settings/logs', icon: <FileText className="h-4 w-4" /> },
        { label: 'Notifications', href: '/settings/notifications', icon: <Bell className="h-4 w-4" /> },
        { label: 'Email', href: '/settings/email', icon: <Mail className="h-4 w-4" /> },
      ],
    },
  ]

  const visibleGroups = isAdminOrRoot
    ? groups
    : groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => userAccessibleHrefs.has(item.href)),
        }))
        .filter((group) => group.items.length > 0)

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {/* Quick Navigation / Return Back */}
        <div className="mb-6 space-y-2">
          <Link
            href="/library"
            onClick={handleItemClick ?? undefined}
            className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white/90 shadow-sm transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Return to Library</span>
            </span>
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-xxs font-semibold tracking-wider text-white/70 uppercase">
              Back
            </span>
          </Link>

          {isAdminOrRoot && (
            <Link
              href="/admin"
              onClick={handleItemClick ?? undefined}
              className="group flex w-full items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-200 shadow-sm transition-all hover:border-amber-500/40 hover:bg-amber-500/20 hover:text-amber-100"
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                <span>Admin Dashboard</span>
              </span>
              <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-xxs font-semibold tracking-wider text-amber-300 uppercase">
                Admin
              </span>
            </Link>
          )}
        </div>

        {/* Grouped Navigation Links */}
        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-2 text-xxs font-bold tracking-wider text-white/40 uppercase">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isSelected = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleItemClick ?? undefined}
                      className={mergeClasses(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        isSelected
                          ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <span
                        className={mergeClasses(
                          'flex h-6 w-6 items-center justify-center rounded-lg transition-colors',
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white'
                        )}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-white/50">
        <span className="font-mono">v{serverVersion}</span>
        <span className="italic">{installSource}</span>
      </div>
    </div>
  )
}
