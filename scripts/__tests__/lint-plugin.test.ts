import { describe, expect, it } from 'bun:test'
import { DOM_ENUM_VALUES, isValidDomEnumValue, meta, rules } from '../lint-plugin'

/**
 * The repository's own lint rule for DOM properties with a fixed set of
 * values.
 *
 * The rule exists because the DOM lib tsrs ships declares `crossOrigin` as
 * `string | null`, and `img.crossOrigin = 'Anonymous'` is a value the
 * browser silently ignores -- the image is never marked cross-origin and a
 * canvas that reads its pixels throws. The TypeScript 7.1 beta compiler
 * caught it with its stricter lib; the compiler is gone, so the rule is
 * what covers it now.
 *
 * A rule that fires on the wrong thing is worse than no rule, because it
 * gets switched off. So both directions are pinned down here: the values
 * that are valid, and the properties that are not DOM properties at all.
 */

describe('isValidDomEnumValue', () => {
  it('accepts the values a DOM property allows', () => {
    expect(isValidDomEnumValue('crossOrigin', 'anonymous')).toBe(true)
    expect(isValidDomEnumValue('crossOrigin', 'use-credentials')).toBe(true)
  })

  it('rejects a value the browser will ignore', () => {
    // The exact bug: the capitalised spelling is not a value the browser
    // knows, so the image is never marked cross-origin.
    expect(isValidDomEnumValue('crossOrigin', 'Anonymous')).toBe(false)
  })

  it('accepts anything for a property that is not a DOM enumeration', () => {
    expect(isValidDomEnumValue('someRandomProperty', 'anything')).toBe(true)
  })

  it('leaves out the property names that are ordinary words', () => {
    // `method`, `kind` and `loading` are DOM properties, and they are also
    // words. A rule that fired on `options.method = 'CUSTOM'` would be a
    // rule that got switched off.
    for (const name of ['method', 'kind', 'loading']) {
      expect(DOM_ENUM_VALUES[name]).toBeUndefined()
    }
  })
})

describe('the plugin', () => {
  it('is named, so bun lint can find its rules', () => {
    // A plugin without a name is refused by bun lint, and a rule that
    // cannot be loaded is a rule that does not run.
    expect(meta.name).toBe('audiobookphile')
  })

  it('exposes the rule', () => {
    expect(rules['dom-enum-values']).toBeDefined()
    expect(typeof rules['dom-enum-values'].create).toBe('function')
  })

  it('reports an invalid value and leaves a valid one alone', () => {
    const reported: string[] = []
    const context = {
      report: (problem: { node: unknown; message: string }) => {
        reported.push(problem.message)
      },
    }

    const visitors = rules['dom-enum-values'].create(context)

    visitors.AssignmentExpression({
      left: { type: 'MemberExpression', computed: false, property: { type: 'Identifier', name: 'crossOrigin' } },
      right: { type: 'Literal', value: 'Anonymous' },
    })
    expect(reported.length).toBe(1)
    expect(reported[0]).toContain('anonymous')

    visitors.AssignmentExpression({
      left: { type: 'MemberExpression', computed: false, property: { type: 'Identifier', name: 'crossOrigin' } },
      right: { type: 'Literal', value: 'anonymous' },
    })
    expect(reported.length).toBe(1)
  })

  it('ignores a value it cannot read', () => {
    // A variable, or a computed property: the rule is a report, not a
    // judgement, and a value it cannot see is not a value it can reject.
    const reported: string[] = []
    const context = { report: (problem: { node: unknown; message: string }) => reported.push(problem.message) }
    const visitors = rules['dom-enum-values'].create(context)

    visitors.AssignmentExpression({
      left: { type: 'MemberExpression', computed: false, property: { type: 'Identifier', name: 'crossOrigin' } },
      right: { type: 'Identifier', name: 'value' },
    })
    visitors.AssignmentExpression({
      left: { type: 'MemberExpression', computed: true, property: { type: 'Literal', value: 'crossOrigin' } },
      right: { type: 'Literal', value: 'Anonymous' },
    })
    expect(reported.length).toBe(0)
  })

  it('reports an invalid value in JSX as well', () => {
    const reported: string[] = []
    const context = { report: (problem: { node: unknown; message: string }) => reported.push(problem.message) }
    const visitors = rules['dom-enum-values'].create(context)

    visitors.JSXAttribute({
      name: { type: 'JSXIdentifier', name: 'crossOrigin' },
      value: { type: 'Literal', value: 'Anonymous' },
    })
    expect(reported.length).toBe(1)
  })
})
