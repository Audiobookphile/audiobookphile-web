'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteAccount } from '@/shared/lib/api/auth'
import Modal from '@/shared/modals/Modal'
import Btn from '@/shared/ui/Btn'
import { createClient } from '@/shared/utils/supabase/client'

interface DeleteAccountBtnProps {
  userId: string
}

export default function DeleteAccountBtn({ userId }: DeleteAccountBtnProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      await deleteAccount(userId)
      await supabase.auth.signOut()
      await fetch('/internal-api/logout', { method: 'POST' }).catch(() => {})
      router.replace('/login')
    } catch (err) {
      console.error('Delete account error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setLoading(false)
    }
  }

  return (
    <>
      <Btn
        onClick={() => setIsModalOpen(true)}
        className="group h-auto items-center justify-between gap-2 border-destructive/20 bg-destructive/10 py-2 ps-6 text-destructive hover:bg-destructive/20"
      >
        <Trash2 size={18} className="text-destructive/60 transition-colors group-hover:text-destructive" />
        <span className="text-[11px] font-bold tracking-widest uppercase">Delete Account</span>
      </Btn>

      <Modal
        isOpen={isModalOpen}
        processing={loading}
        onClose={() => !loading && setIsModalOpen(false)}
        className="max-w-md p-6"
      >
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-foreground">Delete Account?</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Are you sure you want to permanently delete your account? All listening history, bookmarks, and account preferences will be permanently erased. This action cannot be undone.
          </p>
          {error && (
            <p className="text-xs font-semibold text-destructive">{error}</p>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Btn
              onClick={() => setIsModalOpen(false)}
              disabled={loading}
              className="bg-transparent text-foreground/70 hover:bg-white/10"
            >
              Cancel
            </Btn>
            <Btn
              onClick={handleDelete}
              loading={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete My Account
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  )
}
