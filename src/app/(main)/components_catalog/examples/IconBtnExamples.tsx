'use client'
import { Edit2, Heart, Settings, X } from 'lucide-react'
import IconBtn from '@/shared/ui/IconBtn'
import { Code, ComponentExamples, ComponentInfo, Example, ExamplesBlock } from '../ComponentExamples'

// IconBtn Examples
export function IconBtnExamples() {
  return (
    <ComponentExamples title="Icon Buttons">
      <ComponentInfo
        component="IconBtn"
        description="Icon button component with material symbols, loading states, and customization options"
      >
        <p className="mb-2">
          <span className="font-bold">Import:</span>{' '}
          <Code overflow>import IconBtn from &apos;@/shared/ui/IconBtn&apos;</Code>
        </p>
        <p className="mb-2">
          <span className="font-bold">Props:</span> <Code>children</Code>, <Code>borderless</Code>, <Code>loading</Code>
          , <Code>disabled</Code>, <Code>size</Code>, <Code>iconFontSize</Code>, <Code>ariaLabel</Code>
        </p>
      </ComponentInfo>

      <ExamplesBlock>
        <Example title="Default">
          <IconBtn icon={Edit2} />
        </Example>

        <Example title="Large">
          <IconBtn size="large" icon={Edit2} />
        </Example>

        <Example title="Small">
          <IconBtn size="small" icon={Edit2} />
        </Example>

        <Example title="Filled (not outlined)">
          <IconBtn outlined={false} icon={Edit2} />
        </Example>

        <Example title="Borderless">
          <IconBtn borderless icon={Settings} />
        </Example>

        <Example title="Loading">
          <IconBtn loading icon={Edit2} />
        </Example>

        <Example title="Disabled">
          <IconBtn disabled icon={Heart} />
        </Example>

        <Example title="Custom Icon Font Size">
          <IconBtn className="text-3xl" icon={Edit2} />
        </Example>

        <Example title="Custom Background Color">
          <IconBtn className="bg-blue-500" icon={X} />
        </Example>
      </ExamplesBlock>
    </ComponentExamples>
  )
}
