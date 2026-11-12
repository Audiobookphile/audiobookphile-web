'use client'

import { HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Tooltip from '@/shared/ui/Tooltip'

export default function SettingsMoreInfoIcon(props: { moreInfoUrl: string }) {
  const t = useTypeSafeTranslations()

  return (
    <Tooltip text={t('LabelClickForMoreInfo')} position="right" closeOnClick className="leading-0">
      <Link
        href={props.moreInfoUrl}
        target="_blank"
        className="leading-0 text-white/40 transition-colors hover:text-primary"
      >
        <HelpCircle size={18} strokeWidth={2.5} />
      </Link>
    </Tooltip>
  )
}
