'use client'

import Image from 'next/image'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Modal from '@/shared/modals/Modal'

interface RawCoverPreviewModalProps {
  isOpen: boolean
  coverUrl: string | null
  onClose: () => void
}

export default function RawCoverPreviewModal({ isOpen, coverUrl, onClose }: RawCoverPreviewModalProps) {
  const t = useTypeSafeTranslations()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!mt-0 !h-[90dvh] !w-[90dvw] !max-w-none !border-none !bg-transparent !p-0 !shadow-none"
      bgOpacityClass="bg-black/90"
    >
      <button
        type="button"
        aria-label={t('ButtonCloseModal')}
        className="relative flex h-full w-full items-center justify-center"
        onClick={onClose}
      >
        {coverUrl && (
          <Image src={coverUrl} alt={t('LabelCoverPreview')} fill className="object-scale-down" unoptimized />
        )}
      </button>
    </Modal>
  )
}
