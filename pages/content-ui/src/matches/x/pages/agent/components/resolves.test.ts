/**
 * A Tailwind class that does not resolve is silent.
 *
 * These components are copies from a Tailwind 4 codebase. When a copied class
 * names a token this repo does not define, Tailwind emits nothing at all: no
 * warning, no build error, just an element with one fewer style. Three landed
 * that way and none was caught by type-check, lint or any test:
 *
 *  - `rounded-4xl` on the composer — square corners instead of 20.8px.
 *  - `var(--foreground)` inside the shimmer gradient — an invalid gradient
 *    under `bg-clip-text text-transparent`, so the "Thinking" line was
 *    *invisible* for the whole first stretch of every turn.
 *  - `bg-card` on surfaces the port had already retargeted to `surface`.
 *
 * So the check is mechanical: every colour, radius and font-size token these
 * files name has to exist in the config they are compiled against.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import config from '@extension/tailwindcss-config'

const HERE = dirname(fileURLToPath(import.meta.url))

const extend = (config as { theme?: { extend?: Record<string, unknown> } }).theme?.extend ?? {}
const keys = (group: string): Set<string> => {
  const table = (extend[group] ?? {}) as Record<string, unknown>
  const found = new Set<string>()
  for (const [name, value] of Object.entries(table)) {
    found.add(name)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const nested of Object.keys(value)) {
        found.add(nested === 'DEFAULT' ? name : `${name}-${nested}`)
      }
    }
  }
  return found
}

/** Tailwind's own defaults, which the config extends rather than replaces. */
const BUILT_IN_COLORS = new Set([
  'white',
  'black',
  'transparent',
  'current',
  'inherit',
  'red',
  'green',
  'blue',
  'amber',
  'emerald',
  'rose',
  'sky',
  'slate',
  'zinc',
  'neutral',
  'gray',
  'stone',
  'yellow',
  'lime',
  'teal',
  'cyan',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'orange',
])
const BUILT_IN_RADII = new Set(['none', 'sm', '', 'md', 'lg', 'xl', '2xl', '3xl', 'full'])
const BUILT_IN_SIZES = new Set([
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
])

/**
 * Utilities that share a prefix with a colour but name a side, an alignment or
 * a mode. `border-t` is not a colour called "t".
 */
const STRUCTURAL = new Set([
  't',
  'r',
  'b',
  'l',
  'x',
  'y',
  's',
  'e',
  'left',
  'right',
  'center',
  'justify',
  'start',
  'end',
  'inset',
  'solid',
  'dashed',
  'dotted',
  'double',
  'none',
  'hidden',
  'wrap',
  'nowrap',
  'balance',
  'pretty',
  'ellipsis',
  'clip',
  'opacity',
  'clip-text',
  'blend',
  'gradient',
  // `border-l-2` is a side plus a width.
  't-2',
  'r-2',
  'b-2',
  'l-2',
  't-4',
  'l-4',
])

/** `bg-emerald-400` is the colour `emerald` at one of Tailwind's shades. */
const base = (token: string): string => {
  const head = token.split('/')[0]
  return /-\d{2,3}$/.test(head) ? head.replace(/-\d{2,3}$/, '') : head
}

const sources = readdirSync(HERE)
  .filter((name) => /\.tsx?$/.test(name) && !name.endsWith('.test.ts'))
  .map((name) => ({ name, text: readFileSync(join(HERE, name), 'utf8') }))

/**
 * Strip comments and imports.
 *
 * Both are full of things that look like classes and are not: these files
 * explain the very classes they had to replace, and `./text-shimmer-style`
 * scans as `text-shimmer-style`.
 */
const code = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*import[\s\S]*?from\s+'[^']*'/gm, '')

describe('every token these components name exists in the config', () => {
  const colors = new Set([...keys('colors'), ...BUILT_IN_COLORS])
  const radii = new Set([...keys('borderRadius'), ...BUILT_IN_RADII])
  const sizes = new Set([...keys('fontSize'), ...BUILT_IN_SIZES])

  it.each(sources)('$name', ({ text }) => {
    const body = code(text)
    const missing: string[] = []

    for (const [, token] of body.matchAll(/(?<![\w-])rounded-([a-z0-9]+)\b/g)) {
      if (!radii.has(token)) missing.push(`rounded-${token}`)
    }
    for (const [, token] of body.matchAll(/(?<![\w-])text-([a-z]+[a-z0-9-]*)\b(?!\[)/g)) {
      // `text-` is size, colour or alignment, so a hit in any is enough.
      if (STRUCTURAL.has(token)) continue
      if (!sizes.has(token) && !colors.has(base(token))) missing.push(`text-${token}`)
    }
    for (const [, prefix, token] of body.matchAll(
      /(?<![\w-])(bg|border|fill|ring|divide)-([a-z]+[a-z0-9-]*)\b(?!\[)/g
    )) {
      if (STRUCTURAL.has(token)) continue
      if (!colors.has(base(token))) missing.push(`${prefix}-${token}`)
    }

    expect(missing).toEqual([])
  })

  it('the shimmer gradient resolves its colours at build time', () => {
    // `var(--foreground)` is a Tailwind 4 idiom. This repo keeps its palette as
    // hex in the config and defines no such custom property, so the copied
    // gradient was invalid and the text under it disappeared.
    const shimmer = code(readFileSync(join(HERE, 'text-shimmer-style.ts'), 'utf8'))
    expect(shimmer).not.toMatch(/var\(--(foreground|muted-foreground)\)/)
    expect(shimmer).toMatch(/theme\(colors\./)
  })
})
