import { describe, expect, it } from 'bun:test'
import { countConnectionRefused, countServerErrors, isServerListening, shouldRetryOnFreshServer } from '../e2e-signals'

/**
 * The counters that classify a red end-to-end run.
 *
 * They decide nothing -- they report. But a report that is wrong is worse
 * than no report, because it tells a reader that the backend was healthy
 * when it was answering 500, and they go looking in the wrong place. So
 * both directions are covered: a healthy run must read as healthy, and a
 * failing one must read as failing.
 */

describe('countServerErrors', () => {
  it('counts the 5xx the API answered with', () => {
    const output = ['  status: 500,', '  status: 503,'].join('\n')
    expect(countServerErrors(output)).toBe(2)
  })

  it('reports zero for a run where nothing failed', () => {
    expect(countServerErrors('  status: 200,\n  status: 404,')).toBe(0)
  })

  it('does not mistake a 4xx for a server error', () => {
    // A 401 is the web app talking to its own API without a session. It is
    // a real problem, but it is not a backend outage, and reading it as one
    // would send the reader looking at the wrong system.
    expect(countServerErrors('  status: 401,\n  status: 404,')).toBe(0)
  })

  it('counts a single 500 once', () => {
    expect(countServerErrors('  status: 500,')).toBe(1)
  })
})

describe('countConnectionRefused', () => {
  it('counts the refused navigations', () => {
    expect(countConnectionRefused('net::ERR_CONNECTION_REFUSED at http://localhost:3000/login')).toBe(1)
  })

  it('counts none in a healthy run', () => {
    expect(countConnectionRefused('all 17 tests passed')).toBe(0)
  })

  it('counts every occurrence, not just the first', () => {
    const output = ['a ERR_CONNECTION_REFUSED', 'b ERR_CONNECTION_REFUSED', 'c ERR_CONNECTION_REFUSED'].join('\n')
    expect(countConnectionRefused(output)).toBe(3)
  })
})

describe('isServerListening', () => {
  it('is the other way round from the exit code', () => {
    // `lsof -ti` exits zero when it finds a holder, so a free port is the
    // one that exits non-zero. A sign error here decides the retry for a
    // dead dev server, and it has to be right.
    expect(isServerListening(true)).toBe(false)
    expect(isServerListening(false)).toBe(true)
  })
})

describe('shouldRetryOnFreshServer', () => {
  const dead = (_port: string): boolean => true
  const alive = (_port: string): boolean => false

  it('retries when the dev server died', () => {
    expect(shouldRetryOnFreshServer({ refused: 4, attempt: 1, maxAttempts: 2, port: '3100', isPortFree: dead })).toBe(
      true
    )
  })

  it('does not retry when the server is still there', () => {
    // A live server refusing connections is a different problem, and a new
    // server does not solve it.
    expect(shouldRetryOnFreshServer({ refused: 4, attempt: 1, maxAttempts: 2, port: '3100', isPortFree: alive })).toBe(
      false
    )
  })

  it('does not retry a run with no refused connections', () => {
    expect(shouldRetryOnFreshServer({ refused: 0, attempt: 1, maxAttempts: 2, port: '3100', isPortFree: dead })).toBe(
      false
    )
  })

  it('does not retry past the last attempt', () => {
    expect(shouldRetryOnFreshServer({ refused: 4, attempt: 2, maxAttempts: 2, port: '3100', isPortFree: dead })).toBe(
      false
    )
  })

  it('never retries a remote target', () => {
    // There is no local dev server to replace.
    expect(shouldRetryOnFreshServer({ refused: 4, attempt: 1, maxAttempts: 2, port: '', isPortFree: dead })).toBe(false)
  })
})
