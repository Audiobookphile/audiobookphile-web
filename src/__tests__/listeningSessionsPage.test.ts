import { describe, expect, it } from 'bun:test'
import { ListeningSessionsQueryParams } from '@/app/(main)/settings/listening-sessions/actions'

describe('ListeningSessionsQueryParams', () => {
  it('constructs correct query parameters for default options', () => {
    const params: ListeningSessionsQueryParams = {
      page: 1,
      itemsPerPage: 25,
      sort: 'updatedAt',
      desc: true,
    }

    const queryParams = new URLSearchParams()
    queryParams.set('page', params.page.toString())
    queryParams.set('itemsPerPage', params.itemsPerPage.toString())
    queryParams.set('sort', params.sort)
    queryParams.set('desc', params.desc ? '1' : '0')
    if (params.user) {
      queryParams.set('user', params.user)
    }

    expect(queryParams.get('page')).toBe('1')
    expect(queryParams.get('itemsPerPage')).toBe('25')
    expect(queryParams.get('sort')).toBe('updatedAt')
    expect(queryParams.get('desc')).toBe('1')
    expect(queryParams.get('user')).toBeNull()
  })

  it('includes user filter when specified', () => {
    const params: ListeningSessionsQueryParams = {
      page: 2,
      itemsPerPage: 50,
      sort: 'displayTitle',
      desc: false,
      user: 'u-12345',
    }

    const queryParams = new URLSearchParams()
    queryParams.set('page', params.page.toString())
    queryParams.set('itemsPerPage', params.itemsPerPage.toString())
    queryParams.set('sort', params.sort)
    queryParams.set('desc', params.desc ? '1' : '0')
    if (params.user) {
      queryParams.set('user', params.user)
    }

    expect(queryParams.get('page')).toBe('2')
    expect(queryParams.get('itemsPerPage')).toBe('50')
    expect(queryParams.get('sort')).toBe('displayTitle')
    expect(queryParams.get('desc')).toBe('0')
    expect(queryParams.get('user')).toBe('u-12345')
  })
})
