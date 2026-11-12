'use client'

import { useCardSize } from '@/features/library/contexts/CardSizeContext'
import CoverSizeWidget from '@/shared/widgets/CoverSizeWidget'
import { ComponentExamples, ComponentInfo, Example, ExamplesBlock } from '../ComponentExamples'

export function CoverSizeWidgetExamples() {
  const { sizeMultiplier } = useCardSize()

  return (
    <ComponentExamples title="Cover Size Widget">
      <ComponentInfo
        component="CoverSizeWidget"
        description="Interactive widget for adjusting cover sizes with increase/decrease controls. Updates the global card size via CardSizeContext."
      />

      <ExamplesBlock>
        <Example title="Basic Usage">
          <div id="bookshelf" className="mb-4 flex items-end justify-end p-4" style={{ height: '16rem' }}>
            <CoverSizeWidget />
          </div>
          <div className="text-base">Current size multiplier: {sizeMultiplier.toFixed(2)}</div>
        </Example>
      </ExamplesBlock>
    </ComponentExamples>
  )
}
