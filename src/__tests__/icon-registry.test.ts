import { describe, expect, it } from 'bun:test'
import { ChevronDown, CircleCheckBig, CircleHelp, EllipsisVertical, Minus, Play, Plus } from 'lucide-react'
import { getIconForName, getIconLabel } from '../shared/ui/AppIcon'

describe('legacy icon registry', () => {
  it('maps the button icon names used by the library controls', () => {
    expect(getIconForName('more_vert')).toBe(EllipsisVertical)
    expect(getIconForName('keyboard_arrow_down')).toBe(ChevronDown)
    expect(getIconForName('remove')).toBe(Minus)
    expect(getIconForName('add')).toBe(Plus)
    expect(getIconForName('check_circle')).toBe(CircleCheckBig)
    expect(getIconForName('local_play')).toBe(Play)
  })

  it('falls back to an icon instead of exposing a ligature as text', () => {
    expect(getIconForName('unknown_legacy_icon')).toBe(CircleHelp)
    expect(getIconForName('unknown_legacy_icon')).not.toBe('unknown_legacy_icon')
  })

  it('provides stable accessible labels for legacy icon buttons', () => {
    expect(getIconLabel('more_vert')).toBe('More options')
    expect(getIconLabel('keyboard_arrow_down')).toBe('Expand')
    expect(getIconLabel('remove')).toBe('Decrease')
  })
})
