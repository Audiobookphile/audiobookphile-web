'use client'

import { ArrowLeft, Menu, Plus } from 'lucide-react'
import Link from 'next/link'
import { useSettingsDrawer } from '@/shared/contexts/SettingsDrawerContext'
import { useTypeSafeTranslations } from '@/shared/hooks/useTypeSafeTranslations'
import Btn from '@/shared/ui/Btn'
import IconBtn from '@/shared/ui/IconBtn'
import SettingsMoreInfoIcon from './SettingsMoreInfoIcon'

interface AddButtonProps {
  label: string
  onClick: () => void
}

export default function SettingsContent(props: {
  children: React.ReactNode
  title: string
  description?: string
  moreInfoUrl?: string
  backLink?: string
  addButton?: AddButtonProps
  entityCount?: number
}) {
  const t = useTypeSafeTranslations()
  const { toggle } = useSettingsDrawer()

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-10">
      <IconBtn
        className="mb-4 border-white/10 bg-white/5 md:hidden"
        ariaLabel={t('ButtonMenu')}
        size="large"
        borderless
        onClick={toggle}
        icon={Menu}
      />
      <div className="mb-8 rounded-2xl border border-white/10 bg-primary/95 p-4 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          {props.backLink && (
            <Link
              aria-label={t('ButtonBack')}
              href={props.backLink}
              className="text-white/40 transition-colors hover:text-primary"
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </Link>
          )}
          <h1 className="text-xl font-black tracking-widest text-white/90 uppercase">{props.title}</h1>
          {props.entityCount !== undefined && (
            <div className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary/10 px-2 text-[10px] font-black tracking-widest text-primary uppercase">
              {props.entityCount}
            </div>
          )}
          {props.moreInfoUrl && <SettingsMoreInfoIcon moreInfoUrl={props.moreInfoUrl} />}
          <div className="grow" />
          {props.addButton && (
            <Btn
              size="small"
              onClick={props.addButton.onClick}
              className="bg-primary px-6 text-[11px] font-black tracking-widest text-white uppercase shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={14} className="mr-2" strokeWidth={3} />
              {props.addButton.label}
            </Btn>
          )}
        </div>
        {props.description && (
          <p className="mb-8 max-w-2xl text-[13px] leading-relaxed font-medium text-white/40">{props.description}</p>
        )}
        <div className="relative z-10">{props.children}</div>
      </div>
    </div>
  )
}
