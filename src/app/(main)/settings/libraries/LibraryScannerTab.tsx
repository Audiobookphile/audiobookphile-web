'use client'

import { GripVertical } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Btn from '@/shared/ui/Btn'
import ToggleSwitch from '@/shared/ui/ToggleSwitch'
import SortableList from '@/shared/widgets/SortableList'
import { LibrarySettings } from '@/types/api'
import SettingsMoreInfoIcon from '../SettingsMoreInfoIcon'

interface MetadataSource {
  id: string
  name: string
  include: boolean
}

const defaultMetadataSources: MetadataSource[] = [
  { id: 'folderStructure', name: 'Folder structure', include: true },
  { id: 'audioMetatags', name: 'Audio file meta tags OR ebook metadata', include: true },
  { id: 'nfoFile', name: 'NFO file', include: true },
  { id: 'txtFiles', name: 'desc.txt & reader.txt files', include: true },
  { id: 'opfFile', name: 'OPF file', include: true },
  { id: 'absMetadata', name: 'Audiobookphile metadata file', include: true },
]

const defaultMetadataSourceMap = Object.fromEntries(defaultMetadataSources.map((s) => [s.id, s]))

/**
 * Build the visual source list from the persisted metadataPrecedence array.
 * metadataPrecedence stores IDs from lowest-to-highest priority.
 * Visual order is highest-to-lowest priority (reversed), with unused sources at the bottom.
 */
function buildSourceList(metadataPrecedence: string[]): MetadataSource[] {
  const activeSources = metadataPrecedence
    .filter((id) => defaultMetadataSourceMap[id])
    .map((id) => ({ ...defaultMetadataSourceMap[id], include: true }))

  const unusedSources = defaultMetadataSources
    .filter((s) => !metadataPrecedence.includes(s.id))
    .map((s) => ({ ...s, include: false }))

  const result = [...unusedSources, ...activeSources]
  result.reverse()
  return result
}

/** Convert visual order back to the persisted format (included items, lowest-to-highest). */
function deriveMetadataPrecedence(sources: MetadataSource[]): string[] {
  return sources
    .filter((s) => s.include)
    .map((s) => s.id)
    .reverse()
}

interface LibraryScannerTabProps {
  settings: LibrarySettings
  onSettingsChange: (updater: (prev: LibrarySettings) => LibrarySettings) => void
}

export default function LibraryScannerTab({ settings, onSettingsChange }: LibraryScannerTabProps) {
  const t = useTypeSafeTranslations()

  const [sources, setSources] = useState<MetadataSource[]>(() =>
    buildSourceList(settings.metadataPrecedence || defaultMetadataSources.map((s) => s.id))
  )
  const [listKey, setListKey] = useState(0)

  const emitChange = (newSources: MetadataSource[]) => {
    onSettingsChange((prev) => ({
      ...prev,
      metadataPrecedence: deriveMetadataPrecedence(newSources),
    }))
  }

  const handleSortEnd = (sortedItems: MetadataSource[]) => {
    setSources(sortedItems)
    emitChange(sortedItems)
  }

  const handleToggle = (sourceId: string, include: boolean) => {
    const updated = sources.map((s) => (s.id === sourceId ? { ...s, include } : s))
    setSources(updated)
    emitChange(updated)
  }

  const handleReset = () => {
    const resetSources = [...defaultMetadataSources].reverse()
    setSources(resetSources)
    setListKey((k) => k + 1)
    emitChange(resetSources)
  }

  const defaultPrecedenceKey = defaultMetadataSources.map((s) => s.id).join(',')
  const isDefault = useMemo(
    () => deriveMetadataPrecedence(sources).join(',') === defaultPrecedenceKey,
    [sources, defaultPrecedenceKey]
  )

  const firstActiveIndex = useMemo(() => sources.findIndex((s) => s.include), [sources])
  const lastActiveIndex = useMemo(() => sources.findLastIndex((s) => s.include), [sources])

  const getSourcePriority = (sourceId: string) => {
    const activeSources = sources.filter((s) => s.include)
    return activeSources.findIndex((s) => s.id === sourceId) + 1
  }

  const renderItem = (source: MetadataSource, index: number) => (
    <div
      className={`mb-2 flex w-full items-center rounded-xl border border-white/10 bg-white/5 px-3 transition-all duration-200 ${!source.include ? 'opacity-30 grayscale' : 'shadow-lg'}`}
    >
      <div className="drag-handle mr-2 cursor-grab rounded-lg p-2 transition-colors hover:bg-white/10 active:cursor-grabbing">
        <GripVertical size={18} className="opacity-30" />
      </div>
      <div className="w-8 min-w-8 py-1 text-center text-xs font-black opacity-40">
        {source.include ? getSourcePriority(source.id) : ''}
      </div>
      <div className="inline-flex grow items-center justify-between px-2 py-4 text-sm font-bold tracking-wider uppercase">
        {source.name}
        {source.include && (index === firstActiveIndex || index === lastActiveIndex) && (
          <span className="ml-3 rounded-full bg-primary/10 px-3 py-1 text-[9px] font-black tracking-widest text-primary uppercase">
            {index === firstActiveIndex ? t('LabelHighestPriority') : t('LabelLowestPriority')}
          </span>
        )}
      </div>
      <ToggleSwitch value={source.include} offColor="error" onChange={(value) => handleToggle(source.id, value)} />
    </div>
  )

  return (
    <div className="mb-4 h-full w-full px-1 py-1 md:px-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base text-foreground md:text-lg">{t('HeaderMetadataOrderOfPrecedence')}</h2>
        {!isDefault && (
          <Btn size="small" onClick={handleReset}>
            {t('ButtonResetToDefault')}
          </Btn>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between md:justify-start">
        <p className="pr-2 text-sm text-foreground-muted">{t('LabelMetadataOrderOfPrecedenceDescription')}</p>
        <SettingsMoreInfoIcon moreInfoUrl="https://www.audiobookphile.org/guides/book-scanner" />
      </div>

      <SortableList key={listKey} items={sources} onSortEnd={handleSortEnd} renderItem={renderItem} />
    </div>
  )
}
