'use client'

import { ReactNode } from 'react'
import { mergeClasses } from '@/shared/lib/merge-classes'

interface TableRowProps {
  children: ReactNode
  className?: string
}

export default function TableRow({ children, className }: TableRowProps) {
  const rowClasses = mergeClasses('bg-bg odd:bg-primary-hover hover:bg-dropdown-item-selected h-9', className)

  return <tr className={rowClasses}>{children}</tr>
}
