'use client'

import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Modal from '@/shared/modals/Modal'
import Btn from '@/shared/ui/Btn'
import TextInput from '@/shared/ui/TextInput'

interface NewApiKeyModalProps {
  isOpen: boolean
  apiKeyName: string
  apiKeyValue: string
  onClose: () => void
}

export default function NewApiKeyModal({ isOpen, apiKeyName, apiKeyValue, onClose }: NewApiKeyModalProps) {
  const t = useTypeSafeTranslations()

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="px-6 py-8">
        <h2 className="mb-4 text-xl text-foreground">{t('LabelApiKeyCreated', { 0: apiKeyName })}</h2>

        {/* Copy key message */}
        <p className="mb-6 text-foreground-muted">{t('LabelApiKeyCreatedDescription')}</p>

        <TextInput value={apiKeyValue} readOnly showCopy />

        <div className="mt-6 flex justify-end">
          <Btn color="bg-primary" onClick={onClose}>
            {t('ButtonClose')}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}
