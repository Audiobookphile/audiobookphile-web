'use client'

import { Activity, BarChart2, LayoutGrid, LogOut, Menu as MenuIcon, Settings, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Btn from '@/shared/ui/Btn'
import { DropdownMenuItem } from '@/shared/ui/DropdownMenu'
import IconBtn from '@/shared/ui/IconBtn'
import Menu from '@/shared/ui/Menu'

interface AppBarNavProps {
  userCanUpload: boolean
  isAdmin: boolean
  username: string
}

export default function AppBarNav({ userCanUpload: _userCanUpload, isAdmin, username }: AppBarNavProps) {
  const t = useTypeSafeTranslations()
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    try {
      const res = await fetch('/internal-api/logout', {
        method: 'POST',
      })
      if (!res.ok) {
        console.error('Logout error:', res.status, res.statusText)
        return
      }
      router.replace('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }, [router])

  const menuItems = useMemo<DropdownMenuItem[]>(() => {
    const items: DropdownMenuItem[] = [
      {
        id: 'account',
        text: username,
        icon: User,
        onClick: () => router.push('/account'),
        className: 'font-bold text-primary',
      },
      { id: 'divider-1', type: 'divider' },
      {
        id: 'stats',
        text: t('ButtonStats'),
        icon: BarChart2,
        onClick: () => router.push('/account/stats'),
      },
      {
        id: 'catalog',
        text: t('ButtonComponentsCatalog'),
        icon: LayoutGrid,
        onClick: () => router.push('/components_catalog'),
      },
    ]

    if (isAdmin) {
      items.splice(
        2,
        0,
        {
          id: 'settings',
          text: t('HeaderSettings'),
          icon: Settings,
          onClick: () => router.push('/settings'),
          className: 'md:hidden',
        },
        {
          id: 'admin',
          text: 'Admin Dashboard',
          icon: Activity,
          onClick: () => router.push('/admin'),
        }
      )
    }

    items.push(
      { id: 'divider-2', type: 'divider' },
      {
        id: 'logout',
        text: t('ButtonLogout'),
        icon: LogOut,
        onClick: () => void handleLogout(),
        className: 'text-error hover:bg-error/10',
      }
    )

    return items
  }, [username, t, isAdmin, router, handleLogout])

  return (
    <div className="relative">
      <Menu
        items={menuItems}
        trigger={(isOpen) => (
          <>
            {/* Desktop Trigger */}
            <Btn
              size="small"
              ariaDescription={t('ButtonMenu')}
              ariaExpanded={isOpen}
              className="hidden min-w-[120px] justify-between border-white/10 bg-white/5 ps-3 pe-2 hover:bg-white/10 md:flex"
            >
              <span className="block truncate text-sm font-medium">{username}</span>
              <User size={16} className="ml-2 opacity-60" aria-hidden="true" />
            </Btn>

            {/* Mobile Trigger */}
            <IconBtn borderless ariaLabel={t('ButtonMenu')} className="md:hidden" icon={MenuIcon} />
          </>
        )}
      />
    </div>
  )
}
