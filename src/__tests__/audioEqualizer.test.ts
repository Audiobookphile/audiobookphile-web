import { describe, expect, it } from 'bun:test'
import { AudioEqualizer, EQUALIZER_PRESETS, type EqualizerPreset } from '@/features/player/lib/AudioEqualizer'

describe('AudioEqualizer', () => {
  it('defines all required presets including Night Mode dynamic compression', () => {
    const ids = EQUALIZER_PRESETS.map((p) => p.id)
    expect(ids).toContain('off')
    expect(ids).toContain('voice-boost')
    expect(ids).toContain('night-mode')
    expect(ids).toContain('warm')
    expect(ids).toContain('bass-reducer')
    expect(ids).toContain('spoken-word')
  })

  it('provides descriptive labels and descriptions for all presets', () => {
    for (const preset of EQUALIZER_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0)
      expect(preset.shortLabel.length).toBeGreaterThan(0)
      expect(preset.description.length).toBeGreaterThan(0)
    }
  })

  it('manages preset selection state', () => {
    const mockAudio = {} as HTMLAudioElement
    const eq = new AudioEqualizer(mockAudio)
    expect(eq.getPreset()).toBe('off')

    eq.setPreset('night-mode')
    expect(eq.getPreset()).toBe('night-mode')

    eq.setPreset('voice-boost')
    expect(eq.getPreset()).toBe('voice-boost')

    eq.setPreset('off')
    expect(eq.getPreset()).toBe('off')

    eq.destroy()
  })

  it('manages volume boost pre-amp gain state within limits', () => {
    const mockAudio = {} as HTMLAudioElement
    const eq = new AudioEqualizer(mockAudio)
    expect(eq.getVolumeBoost()).toBe(1.0)

    eq.setVolumeBoost(1.5)
    expect(eq.getVolumeBoost()).toBe(1.5)

    eq.setVolumeBoost(2.0)
    expect(eq.getVolumeBoost()).toBe(2.0)

    // Clamps below 1.0 and above 3.0
    eq.setVolumeBoost(0.5)
    expect(eq.getVolumeBoost()).toBe(1.0)

    eq.setVolumeBoost(5.0)
    expect(eq.getVolumeBoost()).toBe(3.0)

    eq.destroy()
  })
})

