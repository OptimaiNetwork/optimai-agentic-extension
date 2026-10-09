import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

export const getContentScriptEntries = (matchesDir: string) => {
  const entryPoints: Record<string, string> = {}

  for (const name of readdirSync(matchesDir)) {
    const entryPath = resolve(matchesDir, name)

    // Only directories are entries. This check has to come first: readdirSync on
    // a stray file (a .DS_Store lands here on macOS) throws ENOTDIR, which used
    // to take the whole build down with an error naming neither the file nor the
    // reason.
    if (!statSync(entryPath).isDirectory()) {
      continue
    }

    const contents = readdirSync(entryPath)
    const indexFile = ['index.ts', 'index.tsx'].find(file => contents.includes(file))

    if (!indexFile) {
      throw new Error(`${name} in \`matches\` doesn't have index.ts or index.tsx file`)
    }

    entryPoints[name] = resolve(entryPath, indexFile)
  }

  return entryPoints
}

/**
 * A bundle name rollup will accept for an IIFE global.
 *
 * The entry name comes from a directory, and directories are kebab-case here.
 * Rollup uses that name as a JavaScript identifier, so `x-network` fails the
 * build with "not a legal JS identifier" — an error that names neither the
 * directory nor the reason.
 */
export const toGlobalName = (entryName: string): string =>
  entryName.replace(/[^a-zA-Z0-9_$]/g, '_')
