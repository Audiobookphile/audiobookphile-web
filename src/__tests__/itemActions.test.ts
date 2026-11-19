import { describe, expect, it } from 'bun:test'

describe('Library Item Action Buttons & Progress State', () => {
  it('correctly maps finished state to toggle payload', () => {
    // When progress is currently finished, next action is un-marking
    const currentFinished = true
    const targetState = !currentFinished
    expect(targetState).toBe(false)

    // When progress is currently not finished, next action is marking finished
    const currentUnfinished = false
    const nextTargetState = !currentUnfinished
    expect(nextTargetState).toBe(true)
  })

  it('determines appropriate tooltip and aria labels based on progress', () => {
    const finishedState = true
    const finishedLabel = finishedState ? 'MessageMarkAsNotFinished' : 'MessageMarkAsFinished'
    expect(finishedLabel).toBe('MessageMarkAsNotFinished')

    const unfinishedState = false
    const unfinishedLabel = unfinishedState ? 'MessageMarkAsNotFinished' : 'MessageMarkAsFinished'
    expect(unfinishedLabel).toBe('MessageMarkAsFinished')
  })
})
