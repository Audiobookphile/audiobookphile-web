export type EqualizerPreset = 'off' | 'voice-boost' | 'warm' | 'bass-reducer' | 'spoken-word' | 'night-mode'

export interface EqualizerPresetInfo {
  id: EqualizerPreset
  label: string
  shortLabel: string
  description: string
}

export interface EqualizerBandPoint {
  freq: number
  gain: number // dB
}

export function getPresetBands(preset: EqualizerPreset): EqualizerBandPoint[] {
  switch (preset) {
    case 'voice-boost':
      return [
        { freq: 20, gain: -6.0 },
        { freq: 85, gain: 0.0 },
        { freq: 1000, gain: 1.0 },
        { freq: 2600, gain: 4.5 },
        { freq: 6000, gain: 2.0 },
        { freq: 20000, gain: 1.0 },
      ]
    case 'night-mode':
      return [
        { freq: 20, gain: -8.0 },
        { freq: 90, gain: 0.0 },
        { freq: 1000, gain: 1.0 },
        { freq: 2200, gain: 2.0 },
        { freq: 5000, gain: 0.0 },
        { freq: 20000, gain: -1.0 },
      ]
    case 'warm':
      return [
        { freq: 20, gain: 1.0 },
        { freq: 320, gain: 2.5 },
        { freq: 1200, gain: 0.0 },
        { freq: 4500, gain: -3.5 },
        { freq: 20000, gain: -5.0 },
      ]
    case 'bass-reducer':
      return [
        { freq: 20, gain: -6.5 },
        { freq: 220, gain: -6.5 },
        { freq: 1500, gain: 0.0 },
        { freq: 5000, gain: 0.0 },
        { freq: 20000, gain: 0.0 },
      ]
    case 'spoken-word':
      return [
        { freq: 20, gain: -6.0 },
        { freq: 100, gain: 0.0 },
        { freq: 1800, gain: 3.0 },
        { freq: 4000, gain: 1.5 },
        { freq: 20000, gain: 0.0 },
      ]
    case 'off':
    default:
      return [
        { freq: 20, gain: 0.0 },
        { freq: 100, gain: 0.0 },
        { freq: 1000, gain: 0.0 },
        { freq: 5000, gain: 0.0 },
        { freq: 20000, gain: 0.0 },
      ]
  }
}

export const EQUALIZER_PRESETS: EqualizerPresetInfo[] = [
  {
    id: 'off',
    label: 'Flat (Bypass)',
    shortLabel: 'Flat',
    description: 'Natural uncolored narrator voice',
  },
  {
    id: 'voice-boost',
    label: 'Voice Boost',
    shortLabel: 'Voice',
    description: 'Crisp vocal presence & speech intelligibility in noisy environments',
  },
  {
    id: 'night-mode',
    label: 'Night Mode (Loudness Normalizer)',
    shortLabel: 'Night',
    description: 'Compresses dynamic range to lift soft whispers and soften sudden loud bursts',
  },
  {
    id: 'warm',
    label: 'Warm & Relaxed',
    shortLabel: 'Warm',
    description: 'Smooths harsh sibilants and reduces ear fatigue for long sessions',
  },
  {
    id: 'bass-reducer',
    label: 'Bass Reducer',
    shortLabel: 'Less Bass',
    description: 'Tames boomy low-end resonance in car speakers and bassy headphones',
  },
  {
    id: 'spoken-word',
    label: 'Spoken Word',
    shortLabel: 'Spoken',
    description: 'Optimized vocal bandpass for audiobooks and podcasts',
  },
]

export class AudioEqualizer {
  private audioCtx: AudioContext | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private lowFilter: BiquadFilterNode | null = null
  private midFilter: BiquadFilterNode | null = null
  private highFilter: BiquadFilterNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private gainNode: GainNode | null = null
  private boostMultiplier = 1.0
  private currentPreset: EqualizerPreset = 'off'
  private isConnected = false

  constructor(private audioElement: HTMLAudioElement) {}

  public getPreset(): EqualizerPreset {
    return this.currentPreset
  }

  public setPreset(preset: EqualizerPreset): void {
    this.currentPreset = preset
    if (preset === 'off' && this.boostMultiplier <= 1.0 && !this.isConnected) {
      // Do not instantiate AudioContext until user actually activates an EQ preset or volume boost
      return
    }

    this.ensureGraph()
    this.applyPreset(preset)
  }

  public getVolumeBoost(): number {
    return this.boostMultiplier
  }

  public setVolumeBoost(multiplier: number): void {
    const clamped = Math.max(1.0, Math.min(3.0, multiplier))
    this.boostMultiplier = clamped
    if (clamped > 1.0 && !this.isConnected) {
      this.ensureGraph()
    }
    if (this.isConnected && this.gainNode && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume()
      }
      this.gainNode.gain.setValueAtTime(clamped, this.audioCtx.currentTime)
    }
  }

  private ensureGraph(): void {
    if (this.isConnected) return
    if (typeof window === 'undefined') return

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtxClass) return

      this.audioCtx = new AudioCtxClass()

      // Create filter chain: low -> mid -> high -> compressor -> gainNode -> destination
      this.lowFilter = this.audioCtx.createBiquadFilter()
      this.midFilter = this.audioCtx.createBiquadFilter()
      this.highFilter = this.audioCtx.createBiquadFilter()
      this.compressor = this.audioCtx.createDynamicsCompressor()
      this.gainNode = this.audioCtx.createGain()
      this.gainNode.gain.setValueAtTime(this.boostMultiplier, this.audioCtx.currentTime)

      this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement)

      this.sourceNode.connect(this.lowFilter)
      this.lowFilter.connect(this.midFilter)
      this.midFilter.connect(this.highFilter)
      this.highFilter.connect(this.compressor)
      this.compressor.connect(this.gainNode)
      this.gainNode.connect(this.audioCtx.destination)

      this.isConnected = true
    } catch (err) {
      console.warn('[AudioEqualizer] Web Audio connection failed (falling back to direct playback):', err)
      this.isConnected = false
    }
  }

  private applyPreset(preset: EqualizerPreset): void {
    if (!this.isConnected || !this.lowFilter || !this.midFilter || !this.highFilter || !this.compressor || !this.audioCtx) return

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume()
    }

    const t = this.audioCtx.currentTime

    switch (preset) {
      case 'night-mode':
        // Dynamic Range Compression: Tame sudden loud audio spikes and elevate soft whispering
        this.compressor.threshold.setValueAtTime(-24, t)
        this.compressor.knee.setValueAtTime(10, t)
        this.compressor.ratio.setValueAtTime(5, t)
        this.compressor.attack.setValueAtTime(0.003, t)
        this.compressor.release.setValueAtTime(0.25, t)

        this.lowFilter.type = 'highpass'
        this.lowFilter.frequency.setValueAtTime(90, t)
        this.lowFilter.Q.setValueAtTime(0.7, t)

        this.midFilter.type = 'peaking'
        this.midFilter.frequency.setValueAtTime(2200, t)
        this.midFilter.Q.setValueAtTime(1.0, t)
        this.midFilter.gain.setValueAtTime(2.0, t)

        this.highFilter.type = 'highshelf'
        this.highFilter.frequency.setValueAtTime(5000, t)
        this.highFilter.gain.setValueAtTime(0.0, t)
        break

      case 'voice-boost':
        this.compressor.threshold.setValueAtTime(0, t)
        this.compressor.ratio.setValueAtTime(1, t)

        this.lowFilter.type = 'highpass'
        this.lowFilter.frequency.setValueAtTime(85, t)
        this.lowFilter.Q.setValueAtTime(0.7, t)

        this.midFilter.type = 'peaking'
        this.midFilter.frequency.setValueAtTime(2600, t)
        this.midFilter.Q.setValueAtTime(1.2, t)
        this.midFilter.gain.setValueAtTime(4.5, t)

        this.highFilter.type = 'highshelf'
        this.highFilter.frequency.setValueAtTime(6000, t)
        this.highFilter.gain.setValueAtTime(2.0, t)
        break

      case 'warm':
        this.compressor.threshold.setValueAtTime(0, t)
        this.compressor.ratio.setValueAtTime(1, t)

        this.lowFilter.type = 'peaking'
        this.lowFilter.frequency.setValueAtTime(320, t)
        this.lowFilter.Q.setValueAtTime(0.9, t)
        this.lowFilter.gain.setValueAtTime(2.5, t)

        this.midFilter.type = 'peaking'
        this.midFilter.frequency.setValueAtTime(1200, t)
        this.midFilter.Q.setValueAtTime(0.8, t)
        this.midFilter.gain.setValueAtTime(0.0, t)

        this.highFilter.type = 'highshelf'
        this.highFilter.frequency.setValueAtTime(4500, t)
        this.highFilter.gain.setValueAtTime(-3.5, t)
        break

      case 'bass-reducer':
        this.compressor.threshold.setValueAtTime(0, t)
        this.compressor.ratio.setValueAtTime(1, t)

        this.lowFilter.type = 'lowshelf'
        this.lowFilter.frequency.setValueAtTime(220, t)
        this.lowFilter.gain.setValueAtTime(-6.5, t)

        this.midFilter.type = 'peaking'
        this.midFilter.frequency.setValueAtTime(1500, t)
        this.midFilter.Q.setValueAtTime(0.7, t)
        this.midFilter.gain.setValueAtTime(0.0, t)

        this.highFilter.type = 'highshelf'
        this.highFilter.frequency.setValueAtTime(5000, t)
        this.highFilter.gain.setValueAtTime(0.0, t)
        break

      case 'spoken-word':
        this.compressor.threshold.setValueAtTime(0, t)
        this.compressor.ratio.setValueAtTime(1, t)

        this.lowFilter.type = 'highpass'
        this.lowFilter.frequency.setValueAtTime(100, t)
        this.lowFilter.Q.setValueAtTime(0.7, t)

        this.midFilter.type = 'peaking'
        this.midFilter.frequency.setValueAtTime(1800, t)
        this.midFilter.Q.setValueAtTime(1.0, t)
        this.midFilter.gain.setValueAtTime(3.0, t)

        this.highFilter.type = 'highshelf'
        this.highFilter.frequency.setValueAtTime(4000, t)
        this.highFilter.gain.setValueAtTime(1.5, t)
        break

      case 'off':
      default:
        this.compressor.threshold.setValueAtTime(0, t)
        this.compressor.ratio.setValueAtTime(1, t)

        this.lowFilter.type = 'peaking'
        this.lowFilter.frequency.setValueAtTime(100, t)
        this.lowFilter.gain.setValueAtTime(0, t)

        this.midFilter.type = 'peaking'
        this.midFilter.frequency.setValueAtTime(1000, t)
        this.midFilter.gain.setValueAtTime(0, t)

        this.highFilter.type = 'peaking'
        this.highFilter.frequency.setValueAtTime(5000, t)
        this.highFilter.gain.setValueAtTime(0, t)
        break
    }
  }

  public destroy(): void {
    try {
      this.sourceNode?.disconnect()
      this.lowFilter?.disconnect()
      this.midFilter?.disconnect()
      this.highFilter?.disconnect()
      this.compressor?.disconnect()
      void this.audioCtx?.close()
    } catch (_e) {
      // Ignore teardown errors
    }
    this.isConnected = false
  }
}
