'use client'

import { motion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  Fingerprint,
  Key,
  Lock,
  Mail,
  MailCheck,
  Shield,
  ShieldAlert,
  Smartphone,
  User,
} from 'lucide-react'
import { mergeClasses } from '@/shared/lib/merge-classes'

type IconName =
  | 'mail'
  | 'lock'
  | 'user'
  | 'alert-circle'
  | 'smartphone'
  | 'fingerprint'
  | 'key'
  | 'shield'
  | 'alert-triangle'
  | 'shield-alert'
  | 'mail-check'

const iconMap: Record<IconName, React.ComponentType<{ size?: number; className?: string }>> = {
  mail: Mail,
  lock: Lock,
  user: User,
  'alert-circle': AlertCircle,
  smartphone: Smartphone,
  fingerprint: Fingerprint,
  key: Key,
  shield: Shield,
  'alert-triangle': AlertTriangle,
  'shield-alert': ShieldAlert,
  'mail-check': MailCheck,
}

interface AuthCardProps {
  /** Card title */
  title: string
  /** Optional subtitle shown below the title */
  subtitle?: string
  /** Optional icon name shown above the title */
  icon?: IconName
  /** Render as a <form> element when provided; plain <div> otherwise */
  onSubmit?: (e: React.FormEvent) => void
  children: React.ReactNode
  className?: string
}

/**
 * Shared card shell used by all auth pages (login, signup, forgot/reset password, verify email).
 * Renders as a <form> when `onSubmit` is provided, otherwise as a <div>.
 */
export default function AuthCard({ title, subtitle, icon, onSubmit, children, className }: AuthCardProps) {
  const cardClass = mergeClasses(
    'bg-primary/95 backdrop-blur-xl border-white/10 w-full max-w-md rounded-2xl border p-10 shadow-2xl relative overflow-hidden',
    icon || subtitle ? 'text-center' : '',
    className
  )

  const getIcon = () => {
    if (!icon) return null
    const IconComp = iconMap[icon]
    if (!IconComp) return null
    return <IconComp size={48} className="mx-auto mb-6 text-accent drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
  }

  const header = (
    <div className="relative z-10">
      {getIcon()}
      <h1 className={mergeClasses('text-3xl font-black tracking-tight uppercase', subtitle ? 'mb-2' : 'mb-8')}>
        {title}
      </h1>
      {subtitle && <p className="mb-8 text-sm leading-relaxed font-medium text-foreground/60">{subtitle}</p>}
    </div>
  )

  const content = (
    <>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
      {header}
      <div className="relative z-10">{children}</div>
    </>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex w-full justify-center"
    >
      {onSubmit ? (
        <form onSubmit={onSubmit} className={cardClass}>
          {content}
        </form>
      ) : (
        <div className={cardClass}>{content}</div>
      )}
    </motion.div>
  )
}
