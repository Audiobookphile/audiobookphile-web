'use client'

import { ABS_TO_LUCIDE_MAP, isValidIcon } from '@/shared/lib/absicons'
import { mergeClasses } from '@/shared/lib/merge-classes'

interface LibraryIconProps {
  icon?: string
  fontSize?: string
  size?: number
  className?: string
  /** Accessibility label for screen readers */
  ariaLabel?: string
  /** Whether the icon is decorative (true) or meaningful (false) */
  decorative?: boolean
}

/**
 * A component that displays a library icon using the absicons font.
 * The component validates the icon against the list of available icons and falls back to 'audiobookphile' if invalid.
 */
export default function LibraryIcon({
  icon = 'audiobookphile',
  fontSize = 'text-lg',
  size = 5,
  className = '',
  ariaLabel,
  decorative = true,
}: LibraryIconProps) {
  const sizeClasses = size === 6 ? 'h-6 w-6 min-w-6' : 'h-5 w-5 min-w-5'
  const classList = mergeClasses('flex items-center justify-center', sizeClasses, fontSize, className)

  const iconToUse = isValidIcon(icon) ? icon : 'audiobookphile'
  const IconComponent = ABS_TO_LUCIDE_MAP[iconToUse]
  // determine pixel size equivalent for lucide
  const lucideSize = size === 6 ? 24 : 20

  // Generate default aria-label if not provided
  const defaultAriaLabel = (() => {
    if (ariaLabel) return ariaLabel
    if (decorative) return ''
    // Convert icon name to readable text
    const readableName = iconToUse.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    return `${readableName} icon`
  })()

  return (
    <div
      cy-id="library-icon"
      className={classList}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : defaultAriaLabel}
      aria-hidden={decorative}
    >
      <IconComponent size={lucideSize} className="shrink-0" />
    </div>
  )
}
