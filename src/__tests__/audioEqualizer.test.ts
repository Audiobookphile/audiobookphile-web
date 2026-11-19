import { describe, expect, it } from 'bun:test'
import {
  AudioEqualizer,
  EQUALIZER_PRESETS,
  type EqualizerPreset,
  getPresetBands,
} from '@/features/player/lib/AudioEqualizer'

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

  it('generates accurate frequency response curve points for all presets', () => {
    for (const preset of EQUALIZER_PRESETS) {
      const bands = getPresetBands(preset.id)
      expect(bands.length).toBeGreaterThanOrEqual(4)
      expect(bands[0].freq).toBe(20)
      expect(bands[bands.length - 1].freq).toBe(20000)

      // Gains should remain in reasonable audiophile bounds [-12dB, +12dB]
      for (const band of bands) {
        expect(band.gain).toBeGreaterThanOrEqual(-12)
        expect(band.gain).toBeLessThanOrEqual(12)
      }
    }

    // Flat should be 0dB everywhere
    const flatBands = getPresetBands('off')
    for (const band of flatBands) {
      expect(band.gain).toBe(0)
    }

    // Voice boost should elevate speech frequencies (~2600Hz)
    const voiceBands = getPresetBands('voice-boost')
    const midBand = voiceBands.find((b) => b.freq === 2600)
    expect(midBand?.gain).toBeGreaterThan(2.0)
  })
})

