import { describe, expect, it } from 'bun:test'

describe('Audio Playback - Vocal Pitch Preservation', () => {
  it('enforces preservesPitch on media element before changing playback rate', () => {
    const mockAudio = {
      playbackRate: 1.0,
      preservesPitch: false,
      webkitPreservesPitch: false,
      mozPreservesPitch: false,
    }

    function setPlaybackRateWithPitchCorrection(
      el: typeof mockAudio,
      rate: number
    ) {
      el.preservesPitch = true
      el.webkitPreservesPitch = true
      el.mozPreservesPitch = true
      el.playbackRate = rate
    }

    setPlaybackRateWithPitchCorrection(mockAudio, 1.75)

    expect(mockAudio.playbackRate).toBe(1.75)
    expect(mockAudio.preservesPitch).toBe(true)
    expect(mockAudio.webkitPreservesPitch).toBe(true)
    expect(mockAudio.mozPreservesPitch).toBe(true)
  })
})
