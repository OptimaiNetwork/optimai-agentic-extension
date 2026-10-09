import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compile } from 'json-schema-to-typescript'
const schema = JSON.parse(
  readFileSync(new URL('../lib/agent/research-contract.schema.json', import.meta.url), 'utf8')
)
const definitions = {}
function collect(name, input) {
  const { $defs = {}, ...node } = input
  for (const [child, value] of Object.entries($defs)) collect(child, value)
  if (node.properties) {
    node.required = [
      ...new Set([
        ...(node.required ?? []),
        ...Object.entries(node.properties)
          .filter(([, value]) => value.default != null || value.type === 'array')
          .map(([key]) => key),
      ]),
    ]
  }
  definitions[name] = node
}
for (const [name, value] of Object.entries(schema.$defs)) collect(name, value)
// UIMessage and its part envelope belong to the AI SDK; only domain payloads are generated here.
delete definitions.ResearchUIMessage
delete definitions.UIPart
const root = {
  type: 'object',
  additionalProperties: false,
  $defs: definitions,
  properties: Object.fromEntries(
    Object.keys(definitions).map((name) => [name, { $ref: `#/$defs/${name}` }])
  ),
}
const output = await compile(root, 'ResearchContract', {
  bannerComment: '/* Generated from research-contract.schema.json. Do not edit. */',
  additionalProperties: false,
  unknownAny: false,
  ignoreMinAndMaxItems: true,
  style: { singleQuote: true, semi: false, tabWidth: 2, printWidth: 100 },
})
const target = fileURLToPath(new URL('../lib/agent/generated/contract.ts', import.meta.url))
if (process.argv.includes('--write')) writeFileSync(target, output)
else if (readFileSync(target, 'utf8') !== output)
  throw new Error('Generated research types are stale; run generate:types')
