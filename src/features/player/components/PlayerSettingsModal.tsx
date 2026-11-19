'use client'

import { Sliders } from 'lucide-react'
import { EQUALIZER_PRESETS, type EqualizerPreset } from '@/features/player/lib/AudioEqualizer'
import type { PlayerSettings } from '@/features/player/hooks/usePlayerSettings'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Modal from '@/shared/modals/Modal'
import Dropdown, { DropdownItem } from '@/shared/ui/Dropdown'
import ToggleSwitch from '@/shared/ui/ToggleSwitch'

interface PlayerSettingsModalProps {
  isOpen: boolean
  settings: PlayerSettings
  onClose: () => void
  onUpdateSettings: (updates: Partial<PlayerSettings>) => void
}

const EQUALIZER_DROPDOWN_ITEMS: DropdownItem[] = EQUALIZER_PRESETS.map((preset) => ({
  text: `${preset.label} (${preset.description})`,
  value: preset.id,
}))

// Playback rate increment/decrement values
const PLAYBACK_RATE_INCREMENT_VALUES: DropdownItem[] = [
  { text: '0.1', value: 0.1 },
  { text: '0.05', value: 0.05 },
]

// Volume boost / preamp gain values
const VOLUME_BOOST_VALUES: DropdownItem[] = [
  { text: '100% (Normal volume)', value: 1.0 },
  { text: '125% (+2 dB boost)', value: 1.25 },
  { text: '150% (+3.5 dB boost)', value: 1.5 },
  { text: '175% (+5 dB boost)', value: 1.75 },
  { text: '200% (+6 dB boost - Quiet Books)', value: 2.0 },
]

// Default sleep timer options
const DEFAULT_SLEEP_TIMER_OPTIONS: DropdownItem[] = [
  { text: '5 Minutes', value: 300 },
  { text: '15 Minutes (Default)', value: 900 },
  { text: '30 Minutes', value: 1800 },
  { text: '45 Minutes', value: 2700 },
  { text: '60 Minutes (1 Hour)', value: 3600 },
  { text: 'End of Chapter', value: -1 },
]

// Smart rewind max duration values
const SMART_REWIND_SECONDS_VALUES: DropdownItem[] = [
  { text: '10 Seconds', value: 10 },
  { text: '20 Seconds (Default)', value: 20 },
  { text: '30 Seconds', value: 30 },
]

export default function PlayerSettingsModal({ isOpen, settings, onClose, onUpdateSettings }: PlayerSettingsModalProps) {
  const t = useTypeSafeTranslations()

  // Jump time values in seconds
  const JUMP_VALUES: DropdownItem[] = [
    { text: t('LabelTimeDurationXSeconds', { 0: 10 }), value: 10 },
    { text: t('LabelTimeDurationXSeconds', { 0: 15 }), value: 15 },
    { text: t('LabelTimeDurationXSeconds', { 0: 30 }), value: 30 },
    { text: t('LabelTimeDurationXSeconds', { 0: 60 }), value: 60 },
    { text: t('LabelTimeDurationXMinutes', { 0: 2 }), value: 120 },
    { text: t('LabelTimeDurationXMinutes', { 0: 5 }), value: 300 },
  ]

  const handleUseChapterTrackChange = (value: boolean) => {
    onUpdateSettings({ useChapterTrack: value })
  }

  const handleJumpForwardChange = (value: string | number) => {
    onUpdateSettings({ jumpForwardAmount: value as number })
  }

  const handleJumpBackwardChange = (value: string | number) => {
    onUpdateSettings({ jumpBackwardAmount: value as number })
  }

  const handlePlaybackRateIncrementChange = (value: string | number) => {
    onUpdateSettings({ playbackRateIncrementDecrement: value as 0.1 | 0.05 })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-md md:max-w-md lg:max-w-md">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
          <Sliders className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">{t('HeaderPlayerSettings')}</h2>
        </div>

        <div className="flex flex-col gap-5">
          {/* Use chapter track toggle */}
          <ToggleSwitch
            value={settings.useChapterTrack}
            label={t('LabelUseChapterTrack')}
            onChange={handleUseChapterTrackChange}
          />

          {/* Jump forward amount dropdown */}
          <Dropdown
            label={t('LabelJumpForwardAmount')}
            value={settings.jumpForwardAmount}
            items={JUMP_VALUES}
            onChange={handleJumpForwardChange}
            usePortal
          />

          {/* Jump backward amount dropdown */}
          <Dropdown
            label={t('LabelJumpBackwardAmount')}
            value={settings.jumpBackwardAmount}
            items={JUMP_VALUES}
            onChange={handleJumpBackwardChange}
            usePortal
          />

          {/* Playback rate increment/decrement dropdown */}
          <Dropdown
            label={t('LabelPlaybackRateIncrementDecrement')}
            value={settings.playbackRateIncrementDecrement}
            items={PLAYBACK_RATE_INCREMENT_VALUES}
            onChange={handlePlaybackRateIncrementChange}
            usePortal
          />

          {/* Audio Equalizer & Voice Boost dropdown */}
          <Dropdown
            label="Audio Equalizer (Speech Clarity)"
            value={settings.equalizerPreset || 'off'}
            items={EQUALIZER_DROPDOWN_ITEMS}
            onChange={(value) => onUpdateSettings({ equalizerPreset: value as EqualizerPreset })}
            usePortal
          />

          {/* Volume Boost / Pre-amp Gain dropdown */}
          <Dropdown
            label="Volume Boost Pre-amp (Quiet Audiobooks)"
            value={settings.volumeBoost || 1.0}
            items={VOLUME_BOOST_VALUES}
            onChange={(value) => onUpdateSettings({ volumeBoost: Number(value) })}
            usePortal
          />

          {/* Default Sleep Timer Duration */}
          <Dropdown
            label="Default Sleep Timer Duration"
            value={settings.defaultSleepTimerDuration || 900}
            items={DEFAULT_SLEEP_TIMER_OPTIONS}
            onChange={(value) => onUpdateSettings({ defaultSleepTimerDuration: Number(value) })}
            usePortal
          />

          {/* Sleep Timer Expiry Chime toggle */}
          <ToggleSwitch
            value={settings.sleepTimerChime ?? true}
            label="Sleep Timer Expiry Chime"
            onChange={(value) => onUpdateSettings({ sleepTimerChime: value })}
          />

          {/* Smart Rewind on Resume toggle */}
          <ToggleSwitch
            value={settings.smartRewindEnabled ?? true}
            label="Smart Rewind on Resume"
            onChange={(value) => onUpdateSettings({ smartRewindEnabled: value })}
          />

          {/* Smart Rewind max duration dropdown */}
          {settings.smartRewindEnabled !== false && (
            <Dropdown
              label="Maximum Smart Rewind Duration"
              value={settings.smartRewindSeconds || 20}
              items={SMART_REWIND_SECONDS_VALUES}
              onChange={(value) => onUpdateSettings({ smartRewindSeconds: Number(value) })}
              usePortal
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
