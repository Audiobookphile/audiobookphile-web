'use client'

import { Folder, FolderPlus, X } from 'lucide-react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Dropdown, { DropdownItem } from '@/shared/ui/Dropdown'
import MediaIconPicker from '@/shared/ui/MediaIconPicker'
import TextInput from '@/shared/ui/TextInput'
import { LibraryFormData } from './LibraryEditModal'

const mediaTypeItems: DropdownItem[] = [
  { text: 'Books', value: 'book' },
  { text: 'Podcasts', value: 'podcast' },
]

interface LibraryDetailsTabProps {
  formData: LibraryFormData
  isEditing: boolean
  providerItems: DropdownItem[]
  newFolderPath: string
  onFormDataChange: (updater: (prev: LibraryFormData) => LibraryFormData) => void
  onMediaTypeChange: (value: string | number) => void
  onNewFolderPathChange: (value: string) => void
  onCommitNewFolder: () => void
  onNewFolderKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onRemoveFolder: (index: number) => void
}

export default function LibraryDetailsTab({
  formData,
  isEditing,
  providerItems,
  newFolderPath,
  onFormDataChange,
  onMediaTypeChange,
  onNewFolderPathChange,
  onCommitNewFolder,
  onNewFolderKeyDown,
  onRemoveFolder,
}: LibraryDetailsTabProps) {
  const t = useTypeSafeTranslations()

  return (
    <>
      {/* Top Row: Media Type, Library Name, Icon, Metadata Provider */}
      <div className="flex flex-wrap items-start gap-2">
        {/* Media Type */}
        <Dropdown
          label={t('LabelMediaType')}
          value={formData.mediaType}
          items={mediaTypeItems}
          disabled={isEditing}
          highlightSelected
          onChange={onMediaTypeChange}
          className="w-full shrink-0 sm:w-36"
        />

        {/* Library Name */}
        <TextInput
          label={t('LabelLibraryName')}
          value={formData.name}
          placeholder={t('LabelLibraryName')}
          onChange={(value) => onFormDataChange((prev) => ({ ...prev, name: value }))}
          className="w-full sm:flex-1"
        />

        {/* Icon */}
        <MediaIconPicker
          value={formData.icon}
          label={t('LabelIcon')}
          onChange={(value) => onFormDataChange((prev) => ({ ...prev, icon: value }))}
        />

        {/* Metadata Provider */}
        <Dropdown
          label={t('LabelMetadataProvider')}
          value={formData.provider}
          items={providerItems}
          highlightSelected
          onChange={(value) => onFormDataChange((prev) => ({ ...prev, provider: String(value) }))}
          className="flex-1 sm:w-44 sm:shrink-0"
        />
      </div>

      {/* Folders Section */}
      <div className="mt-8">
        <h3 className="mb-3 text-[10px] font-black tracking-widest text-white/40 uppercase">Storage Bucket Prefixes</h3>

        <div className="space-y-3">
          {/* Committed folder paths */}
          {formData.folders.map((folder, index) => (
            <div
              key={index}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-sm backdrop-blur-md transition-all hover:border-white/20"
            >
              <div className="rounded-xl border border-primary/20 bg-primary/20 p-2">
                <Folder size={18} className="fill-current text-primary" />
              </div>
              <TextInput
                value={folder.fullPath}
                readOnly
                borderless
                className="flex-1 text-sm font-medium text-white/80"
              />
              <button
                type="button"
                className="rounded-xl p-2 text-white/20 transition-all hover:bg-error/10 hover:text-error"
                onClick={() => onRemoveFolder(index)}
                aria-label={t('ButtonRemove')}
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          ))}

          {/* Always-visible new folder input */}
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-2 backdrop-blur-md transition-all hover:border-white/20">
            <div className="rounded-xl border border-success/20 bg-success/20 p-2">
              <FolderPlus size={18} className="fill-current text-success" />
            </div>
            <TextInput
              value={newFolderPath}
              placeholder="e.g., books/sci-fi/"
              onChange={onNewFolderPathChange}
              onBlur={onCommitNewFolder}
              onKeyDown={onNewFolderKeyDown}
              borderless
              className="flex-1 text-sm"
            />
          </div>
        </div>
      </div>
    </>
  )
}
