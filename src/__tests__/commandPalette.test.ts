import { describe, expect, it } from 'bun:test'

describe('CommandPalette Aggregation & Quick Nav', () => {
  const quickNavActions = [
    { type: 'action' as const, id: 'act-listening-sessions', title: 'Listening Sessions', subtitle: 'Real-time & history tracking', href: '/settings/listening-sessions' },
    { type: 'action' as const, id: 'act-rss-feeds', title: 'Podcasts & OPDS Feeds', subtitle: 'Private feeds & syndication catalog', href: '/settings/rss-feeds' },
    { type: 'action' as const, id: 'act-stats', title: 'Listening Statistics', subtitle: 'Habits & playback overview', href: '/account/stats' },
    { type: 'action' as const, id: 'act-users', title: 'User Management', subtitle: 'Manage accounts & permissions', href: '/settings/users' },
    { type: 'action' as const, id: 'act-settings', title: 'Settings', subtitle: 'Global server configuration', href: '/settings' },
  ]

  it('filters quick navigation actions by search query', () => {
    const query = 'sessions'
    const filtered = quickNavActions.filter(
      (a) =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.subtitle.toLowerCase().includes(query.toLowerCase())
    )
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe('act-listening-sessions')
  })

  it('aggregates books, authors, series, and actions seamlessly', () => {
    const books = [
      { id: 'b1', title: 'Project Hail Mary', author: 'Andy Weir' },
    ]
    const authors = [
      { id: 'a1', name: 'Andy Weir', numBooks: 3 },
    ]
    const series = [
      { id: 's1', name: 'The Martian Chronicles', numBooks: 2 },
    ]

    const items = [
      ...books.map((b) => ({ type: 'book', id: b.id, title: b.title, subtitle: b.author })),
      ...authors.map((a) => ({ type: 'author', id: a.id, title: a.name, subtitle: `${a.numBooks} books` })),
      ...series.map((s) => ({ type: 'series', id: s.id, title: s.name, subtitle: `${s.numBooks} books` })),
      ...quickNavActions,
    ]

    expect(items.length).toBe(1 + 1 + 1 + 5)
    expect(items[0].type).toBe('book')
    expect(items[1].type).toBe('author')
    expect(items[2].type).toBe('series')
    expect(items[3].type).toBe('action')
  })
})
