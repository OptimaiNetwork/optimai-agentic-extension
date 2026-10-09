import globalConfig from '@extension/tailwindcss-config'
import deepmerge from 'deepmerge'
import type { Config } from 'tailwindcss'

export const withUI = (tailwindConfig: Config): Config => {
  const config = deepmerge(tailwindConfig, {
    content: ['../../packages/ui/lib/**/*.tsx'],
  }) as Config
  return deepmerge(globalConfig, config) as Config
}
