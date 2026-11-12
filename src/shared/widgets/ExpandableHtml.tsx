'use client'

import { motion } from 'framer-motion'
import DOMPurify from 'isomorphic-dompurify'
import { ChevronDown } from 'lucide-react'
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'

interface ExpandableHtmlProps {
  html: string
  lineClamp?: number
  className?: string
}

function ExpandableHtml({ html, lineClamp = 4, className = '' }: ExpandableHtmlProps) {
  const t = useTypeSafeTranslations()
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isClamped, setIsClamped] = useState(false)

  const checkClamping = useCallback(() => {
    const element = contentRef.current
    if (!element) return

    const setIsClampedIfOverflowing = () => {
      const isOverflowing = element.scrollHeight > element.clientHeight + 1
      setIsClamped(isOverflowing)
    }

    if (!isExpanded) {
      setIsClampedIfOverflowing()
    } else {
      const { webkitLineClamp, overflow } = element.style
      element.style.webkitLineClamp = lineClamp.toString()
      element.style.overflow = 'hidden'
      setIsClampedIfOverflowing()
      element.style.webkitLineClamp = webkitLineClamp
      element.style.overflow = overflow
    }
  }, [lineClamp, isExpanded])

  useLayoutEffect(() => {
    checkClamping()
  }, [html, checkClamping])

  useLayoutEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      checkClamping()
    })

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [checkClamping])

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isClamped) return
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button')) return
    setIsExpanded((prev) => !prev)
  }

  return (
    <div className={className}>
      <motion.div
        layout
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 'auto', // Motion handles the layout change
        }}
        className="relative"
      >
        <div
          role={isClamped ? 'button' : undefined}
          tabIndex={isClamped ? 0 : undefined}
          aria-expanded={isClamped ? isExpanded : undefined}
          aria-label={isClamped ? (isExpanded ? t('ButtonReadLess') : t('ButtonReadMore')) : undefined}
          onKeyDown={(e) => {
            if (isClamped && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              setIsExpanded((prev) => !prev)
            }
          }}
          ref={contentRef}
          className="default-style less-spacing max-w-none overflow-hidden transition-all duration-300"
          dir="auto"
          style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: isExpanded ? 'unset' : lineClamp,
            overflow: isExpanded ? 'visible' : 'hidden',
            cursor: isClamped ? 'pointer' : 'auto',
          }}
          onClick={handleContentClick}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} /* lefthook-ignore */
        />
      </motion.div>

      {isClamped && (
        <button
          type="button"
          className="group mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.8em] font-black tracking-widest text-foreground/40 uppercase transition-all duration-300 select-none hover:bg-white/5 hover:text-primary active:scale-95"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? t('ButtonReadLess') : t('ButtonReadMore')}
          <ChevronDown
            size={14}
            className={`transition-transform duration-500 ease-out ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  )
}

export default React.memo(ExpandableHtml)
