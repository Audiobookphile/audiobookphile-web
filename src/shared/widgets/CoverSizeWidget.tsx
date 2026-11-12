'use client'

import { Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCardSize } from '@/features/library/contexts/CardSizeContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'
import IconBtn from '@/shared/ui/IconBtn'

/** Available cover sizes in pixels */
export const AVAILABLE_COVER_SIZES = [60, 80, 100, 120, 140, 160, 180, 200, 220]
export const NUM_AVAILABLE_COVER_SIZES = 9
const DEFAULT_SIZE_INDEX = 3
export const NUM_AVAILABLE_MOBILE_COVER_SIZES = 3
const DEFAULT_MOBILE_SIZE_INDEX = 2
const BASE_COVER_SIZE = 120

interface CoverSizeWidgetProps {
  className?: string
}

export default function CoverSizeWidget({ className }: CoverSizeWidgetProps) {
  const t = useTypeSafeTranslations()
  const { isMobile, setSizeMultiplier } = useCardSize()
  const [sizeIndex, setSizeIndex] = useState(isMobile ? DEFAULT_MOBILE_SIZE_INDEX : DEFAULT_SIZE_INDEX)
  const numAvailableCoverSizes = isMobile ? NUM_AVAILABLE_MOBILE_COVER_SIZES : NUM_AVAILABLE_COVER_SIZES
  const [coverWidth, setCoverWidth] = useState(AVAILABLE_COVER_SIZES[sizeIndex])

  useEffect(() => {
    setSizeIndex(isMobile ? DEFAULT_MOBILE_SIZE_INDEX : DEFAULT_SIZE_INDEX)
  }, [isMobile])

  useEffect(() => {
    setCoverWidth(AVAILABLE_COVER_SIZES[sizeIndex])
  }, [sizeIndex])

  useEffect(() => {
    const multiplier = coverWidth / BASE_COVER_SIZE
    setSizeMultiplier(multiplier)
  }, [coverWidth, setSizeMultiplier])

  const increaseSize = useCallback(() => {
    setSizeIndex((prev) => Math.min(numAvailableCoverSizes - 1, prev + 1))
  }, [numAvailableCoverSizes])

  const decreaseSize = useCallback(() => {
    setSizeIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const isAtMinSize = sizeIndex === 0
  const isAtMaxSize = sizeIndex === numAvailableCoverSizes - 1

  const buttonClass = useMemo(() => 'h-9 w-9 rounded-full disabled:bg-transparent disabled:cursor-default', [])
  const containerClass = useMemo(
    () =>
      mergeClasses(
        'rounded-full bg-primary p-1 border border-border text-center flex items-center gap-1 shadow-modal-content select-none',
        className
      ),
    [className]
  )
  const textClass = useMemo(() => 'px-1 font-mono text-center w-12 text-base tabular-nums', [])

  return (
    <div>
      <div aria-label={t('LabelCoverSize')} role="group" className={containerClass}>
        <IconBtn
          className={buttonClass}
          disabled={isAtMinSize}
          onClick={decreaseSize}
          ariaLabel={t('LabelDecreaseCoverSize')}
          borderless
          icon={Minus}
        />
        <p className={textClass} aria-live="polite">
          {coverWidth}
        </p>
        <IconBtn
          className={buttonClass}
          disabled={isAtMaxSize}
          onClick={increaseSize}
          ariaLabel={t('LabelIncreaseCoverSize')}
          borderless
          icon={Plus}
        />
      </div>
    </div>
  )
}
