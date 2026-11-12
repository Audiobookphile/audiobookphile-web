'use client'
import { motion } from 'framer-motion'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import { mergeClasses } from '@/shared/lib/merge-classes'
import { TranslationKey } from '@/types/translations'

interface ProgressIndicatorProps {
  progress: number // 0-100
  label?: TranslationKey
  className?: string
}

export default function ProgressIndicator({
  progress: rawProgress,
  label = 'LabelProgress',
  className = '',
}: ProgressIndicatorProps) {
  const t = useTypeSafeTranslations()
  const progress = Math.min(Math.max(rawProgress, 0), 100)

  return (
    <div className={mergeClasses('w-full py-4', className)}>
      <div className="mb-2 flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="flex-1">
          {typeof label === 'string' ? (
            <p className="text-xs font-bold tracking-wider text-foreground/60 uppercase">{t(label)}</p>
          ) : (
            label
          )}
        </motion.div>
        <motion.p
          key={progress}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="min-w-[3rem] text-right font-mono text-sm font-bold text-accent"
        >
          {progress.toFixed(0)}%
        </motion.p>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/5 bg-white/5 backdrop-blur-sm">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          className="relative h-full rounded-full bg-accent shadow-[0_0_15px_rgba(245,158,11,0.5)]"
        >
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </motion.div>
      </div>
    </div>
  )
}
