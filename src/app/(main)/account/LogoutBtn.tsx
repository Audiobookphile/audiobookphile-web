'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import Btn from '@/shared/ui/Btn'
import { createClient } from '@/shared/utils/supabase/client'

export default function LogoutBtn() {
  const t = useTranslations()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    setLoading(true)
    try {
      // Sign out of Supabase
      await supabase.auth.signOut()

      // Calls the Abs server logout endpoint and clears the NextJS server cookies
      const res = await fetch('/internal-api/logout', {
        method: 'POST',
      })
      if (!res.ok) {
        console.error('Logout error:', res.status, res.statusText)
      }
      router.replace('/login')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Btn onClick={handleLogout} loading={loading} className="group h-auto items-center justify-between gap-2 py-2 ps-6">
      <LogOut size={18} className="text-foreground/40 transition-colors group-hover:text-primary" />
      <span className="text-[11px] font-bold tracking-widest uppercase">{t('LabelLogout')}</span>
    </Btn>
  )
}
