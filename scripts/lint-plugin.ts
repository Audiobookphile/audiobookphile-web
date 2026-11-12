/**
 * A lint rule for the DOM properties whose value is a fixed set.
 *
 * `img.crossOrigin = 'Anonymous'` is a type error in the TypeScript 7.1
 * beta compiler, because its `lib.dom.d.ts` declares the property as
 * `"anonymous" | "use-credentials" | null`. The DOM lib that tsrs ships
 * declares it as `string | null`, which accepts the typo -- and the typo
 * does nothing at all: the browser ignores an unknown value, the image is
 * never marked as cross-origin, and a canvas that reads its pixels throws
 * a security error. It is the kind of bug that looks like it works.
 *
 * React's own types already cover the JSX form -- `crossOrigin?: CrossOrigin`
 * -- so the gap is the property assignment, and this rule is that gap.
 *
 * The rule is deliberately narrow. The names below are DOM-only, so a
 * property with one of them is a DOM property; the ones that are common
 * words -- `method`, `kind`, `loading` -- are left out, because a rule
 * that fires on `options.method = 'CUSTOM'` is a rule that gets switched
 * off, and a rule that is switched off protects nothing.
 */

/**
 * The DOM properties whose value is a fixed set, and the values.
 *
 * These are the HTML spec's enumerations, which is what the strict
 * `lib.dom.d.ts` encodes.
 */
export const DOM_ENUM_VALUES: Record<string, readonly string[]> = {
  crossOrigin: ['anonymous', 'use-credentials'],
  fetchPriority: ['high', 'low', 'auto'],
  formMethod: ['get', 'post', 'dialog'],
  enctype: ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'],
  preload: ['none', 'metadata', 'auto'],
  decoding: ['async', 'auto', 'sync'],
}

/**
 * Whether a value is one the property accepts.
 *
 * A property that is not in the table accepts anything, and a value that is
 * not a string literal cannot be checked without types -- so both are
 * "valid" here, and the rule stays a report rather than a judgement.
 */
export const isValidDomEnumValue = (property: string, value: string): boolean => {
  const allowed = DOM_ENUM_VALUES[property]
  if (!allowed) return true
  return allowed.includes(value)
}

/** A node, as far as this rule is concerned. */
type Node = Record<string, unknown>

/**
 * Whether a value is an object, which is every AST node.
 *
 * The AST is read through this rather than through `any`, because this
 * repository's own lint rules count `any` as debt and the rule has to be
 * able to run in the repository that holds it.
 */
const isNode = (value: unknown): value is Node => typeof value === 'object' && value !== null

/** The string a node holds, when it holds one. */
const stringOf = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

export const meta = {
  name: 'audiobookphile',
}

export const rules = {
  'dom-enum-values': {
    create(context: {
      report: (problem: { node: unknown; message: string }) => void
    }): Record<string, (node: unknown) => void> {
      const check = (node: Node, property: string, value: string): void => {
        if (isValidDomEnumValue(property, value)) return
        const allowed = DOM_ENUM_VALUES[property]
        context.report({
          node,
          message:
            `\`${property}\` is one of ${allowed.map((entry) => `\`${entry}\``).join(', ')}; ` +
            `\`${value}\` is not one of them, and the browser will ignore it.`,
        })
      }

      /** The property name of a member expression, when it has one. */
      const memberProperty = (node: Node): string | undefined => {
        if (node.type !== 'MemberExpression' || node.computed === true) return undefined
        const property = node.property
        if (!isNode(property) || property.type !== 'Identifier') return undefined
        return stringOf(property.name)
      }

      /** The string a literal node holds, when it is one. */
      const literalValue = (node: unknown): string | undefined => {
        if (!isNode(node) || node.type !== 'Literal') return undefined
        return stringOf(node.value)
      }

      return {
        // `element.crossOrigin = 'Anonymous'`
        AssignmentExpression(node: unknown): void {
          if (!isNode(node)) return
          const left = node.left
          if (!isNode(left)) return
          const property = memberProperty(left)
          if (property === undefined) return
          const value = literalValue(node.right)
          if (value === undefined) return
          check(node, property, value)
        },

        // `<img crossOrigin="Anonymous" />`
        JSXAttribute(node: unknown): void {
          if (!isNode(node)) return
          const name = node.name
          if (!isNode(name) || name.type !== 'JSXIdentifier') return
          const property = stringOf(name.name)
          if (property === undefined) return
          const value = literalValue(node.value)
          if (value === undefined) return
          check(node, property, value)
        },
      }
    },
  },
}
