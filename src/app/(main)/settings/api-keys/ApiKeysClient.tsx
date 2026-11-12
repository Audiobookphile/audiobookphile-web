'use client'

import { useCallback, useState } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { ApiKey, User } from '@/types/api'
import SettingsContent from '../SettingsContent'
import ApiKeysTable from './ApiKeysTable'
import { createApiKey, updateApiKey } from './actions'
import EditApiKeyModal, { ApiKeyFormData } from './EditApiKeyModal'
import NewApiKeyModal from './NewApiKeyModal'

interface ApiKeysClientProps {
  apiKeys: ApiKey[]
  users: User[]
}

export default function ApiKeysClient({ apiKeys, users }: ApiKeysClientProps) {
  const t = useTypeSafeTranslations()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null)
  const [newApiKey, setNewApiKey] = useState<{ name: string; value: string } | null>(null)

  const handleAddClick = useCallback(() => {
    setEditingApiKey(null)
    setIsModalOpen(true)
  }, [])

  const handleEditClick = useCallback((apiKey: ApiKey) => {
    setEditingApiKey(apiKey)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingApiKey(null)
  }, [])

  const handleSubmit = useCallback(
    async (formData: ApiKeyFormData) => {
      const payload = {
        name: formData.name,
        expiresIn: formData.expiresIn,
        isActive: formData.isActive,
        userId: formData.userId,
      }

      if (editingApiKey) {
        await updateApiKey(editingApiKey.id, payload)
      } else {
        const result = await createApiKey(payload)
        if (result.apiKey.apiKey) {
          setNewApiKey({ name: result.apiKey.name, value: result.apiKey.apiKey })
        }
      }

      handleCloseModal()
    },
    [editingApiKey, handleCloseModal]
  )

  const handleCloseNewApiKeyModal = useCallback(() => {
    setNewApiKey(null)
  }, [])

  return (
    <SettingsContent
      title={t('HeaderApiKeys')}
      moreInfoUrl="https://www.audiobookphile.org/guides/api-keys"
      addButton={{
        label: t('ButtonAddApiKey'),
        onClick: handleAddClick,
      }}
    >
      <ApiKeysTable apiKeys={apiKeys} onEditClick={handleEditClick} />

      <EditApiKeyModal
        isOpen={isModalOpen}
        apiKey={editingApiKey}
        users={users}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />

      {newApiKey && (
        <NewApiKeyModal
          isOpen={!!newApiKey}
          apiKeyName={newApiKey.name}
          apiKeyValue={newApiKey.value}
          onClose={handleCloseNewApiKeyModal}
        />
      )}
    </SettingsContent>
  )
}
