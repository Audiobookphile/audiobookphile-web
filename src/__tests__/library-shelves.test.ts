import { describe, expect, test } from 'bun:test'
import { normalizeShelves, shelfEntities } from '../shared/lib/library-shelves'

describe('normalizeShelves', () => {
  test('returns [] for non-array input', () => {
    expect(normalizeShelves(undefined)).toEqual([])
    expect(normalizeShelves(null)).toEqual([])
    expect(normalizeShelves({})).toEqual([])
    expect(normalizeShelves('nope')).toEqual([])
  })

  test('keeps valid shelves', () => {
    const shelves = [
      { id: 'continue-listening', label: 'Continue Listening', type: 'book', entities: [{ id: '1' }] },
      { id: 'recent-series', label: 'Recent Series', type: 'series', entities: [] },
    ]
    const result = normalizeShelves(shelves)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('continue-listening')
    expect(result[1].entities).toEqual([])
  })

  test('coerces shelf.entities non-arrays to []', () => {
    const result = normalizeShelves([{ id: 'discover', label: 'Discover', type: 'book', entities: null }])
    expect(shelfEntities(result[0])).toEqual([])
  })

  test('drops null/non-object shelf entries', () => {
    expect(normalizeShelves([null, 42, { id: 'discover', entities: [] }])).toHaveLength(1)
  })
})

describe('shelfEntities', () => {
  test('returns [] when entities missing', () => {
    expect(shelfEntities(undefined)).toEqual([])
    expect(shelfEntities({})).toEqual([])
    expect(shelfEntities({ entities: 'x' })).toEqual([])
  })

  test('returns the array when present', () => {
    expect(shelfEntities({ entities: [1, 2] })).toEqual([1, 2])
  })
})
