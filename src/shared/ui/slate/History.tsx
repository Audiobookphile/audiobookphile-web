'use client'

import { Redo2, Undo2 } from 'lucide-react'
import React, { memo, useCallback } from 'react'
import { useSlate } from 'slate-react'

import IconBtn from '@/shared/ui/IconBtn'
import { buttonClassBase } from './constants'

// --- UndoButton Component ---

export const UndoButton = memo(
  ({
    buttonId,
    tabIndex,
    onFocus,
    isUndoAvailable,
  }: {
    buttonId: string
    tabIndex: number
    onFocus: () => void
    isUndoAvailable: boolean
  }) => {
    const editor = useSlate()

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (isUndoAvailable) {
            editor.undo()
          }
        }
      },
      [editor, isUndoAvailable]
    )

    const handleMouseDown = useCallback(
      (event: React.MouseEvent) => {
        event.preventDefault()
        if (isUndoAvailable) {
          editor.undo()
        }
      },
      [editor, isUndoAvailable]
    )

    return (
      <IconBtn
        size="small"
        className={buttonClassBase}
        disabled={!isUndoAvailable}
        tabIndex={tabIndex}
        data-button-id={buttonId}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        icon={Undo2}
        aria-label="Undo"
        {...{ onFocus }}
      />
    )
  }
)

UndoButton.displayName = 'UndoButton'

// --- RedoButton Component ---

export const RedoButton = memo(
  ({
    buttonId,
    tabIndex,
    onFocus,
    isRedoAvailable,
  }: {
    buttonId: string
    tabIndex: number
    onFocus: () => void
    isRedoAvailable: boolean
  }) => {
    const editor = useSlate()

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (isRedoAvailable) {
            editor.redo()
          }
        }
      },
      [editor, isRedoAvailable]
    )

    const handleMouseDown = useCallback(
      (event: React.MouseEvent) => {
        event.preventDefault()
        if (isRedoAvailable) {
          editor.redo()
        }
      },
      [editor, isRedoAvailable]
    )

    return (
      <IconBtn
        size="small"
        className={buttonClassBase}
        disabled={!isRedoAvailable}
        tabIndex={tabIndex}
        data-button-id={buttonId}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        icon={Redo2}
        aria-label="Redo"
        {...{ onFocus }}
      />
    )
  }
)

RedoButton.displayName = 'RedoButton'
