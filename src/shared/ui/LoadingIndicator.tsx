import { motion } from 'framer-motion'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { TranslationKey } from '@/types/translations'

interface LoadingIndicatorProps {
  label?: TranslationKey
  children?: React.ReactNode
  variant?: 'overlay' | 'inline'
}

export default function LoadingIndicator({ label, children, variant = 'overlay' }: LoadingIndicatorProps) {
  const t = useTypeSafeTranslations()
  const displayLabel = t(label || 'LabelLoadingIndicator')

  const rootClass =
    variant === 'inline'
      ? 'flex items-center justify-center'
      : 'absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={rootClass}
      role="status"
      aria-live="polite"
      aria-label={displayLabel}
    >
      <div className="w-48">
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-primary/80 px-8 py-6 shadow-2xl backdrop-blur-md">
          <div className="relative mb-4 h-12 w-12">
            {/* Pulsing rings */}
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full border-2 border-yellow-500/50"
            />
            <motion.div
              animate={{
                scale: [1.2, 1.8, 1.2],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute inset-0 rounded-full border-2 border-yellow-500/30"
            />
            {/* Center dot */}
            <div className="absolute inset-3 rounded-full bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          </div>

          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-sm font-medium tracking-wide text-foreground"
          >
            {displayLabel}
          </motion.div>

          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </motion.div>
  )
}
