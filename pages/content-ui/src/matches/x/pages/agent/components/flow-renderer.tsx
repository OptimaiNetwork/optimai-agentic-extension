import { useId } from 'react'
import type { FlowNode, VisualizationSpec, FlowIcon } from '@extension/shared'
import { cn } from '@extension/ui'
import { Check, Database, Globe, Info, Sparkles, User, Workflow, Wrench } from 'lucide-react'

import { layoutFlow } from '@x/modules/agent-presentation/flow-layout'

import { CardFooter, Chip, IconPlate } from './card-kit'
import { ResearchCardShell } from './research-card-shell'

/**
 * A flow, drawn from a spec that had no geometry in it.
 *
 * The model chose nodes, edges and a direction; everything visual — positions,
 * colours, the arrow head, the text truncation — is decided here. That split is
 * the point: a model that emits SVG emits SVG that is subtly wrong in a panel
 * it cannot see, and a model that emits coordinates has to be trusted with a
 * layout it cannot measure.
 *
 * Text is rendered as SVG `<text>` with a hard character cap rather than
 * anything that could interpret markup. Labels come from a model, and a model's
 * string is not markup here under any circumstances.
 */

const ICONS: Record<FlowIcon, typeof User> = {
  user: User,
  sparkles: Sparkles,
  wrench: Wrench,
  database: Database,
  globe: Globe,
  check: Check,
}

const VARIANT = {
  default: { fill: 'rgb(255 255 255 / 0.05)', stroke: 'rgb(255 255 255 / 0.12)' },
  primary: { fill: 'rgb(56 189 248 / 0.12)', stroke: 'rgb(56 189 248 / 0.35)' },
  success: { fill: 'rgb(52 211 153 / 0.12)', stroke: 'rgb(52 211 153 / 0.35)' },
  warning: { fill: 'rgb(251 191 36 / 0.12)', stroke: 'rgb(251 191 36 / 0.35)' },
  danger: { fill: 'rgb(251 113 133 / 0.12)', stroke: 'rgb(251 113 133 / 0.35)' },
} as const

/** Cut rather than wrapped: a box is a fixed size and an ellipsis is honest. */
const clip = (text: string, limit: number): string =>
  text.length > limit ? `${text.slice(0, limit - 1)}…` : text

const GraphFlow = ({ spec }: { spec: VisualizationSpec }) => {
  const arrow = useId()
  const layout = layoutFlow(spec)
  if (layout.nodes.length === 0) return null

  return (
    <div className="mx-3.5 my-3.5 rounded-xl border border-[#323232] bg-[#242424] p-2.5">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="mx-auto block h-auto w-full"
        style={{ maxWidth: layout.width }}
        role="img"
        aria-label={spec.title}>
        <defs>
          <marker
            id={arrow}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="rgb(255 255 255 / 0.3)" />
          </marker>
        </defs>

        {layout.edges.map((edge, index) => {
          const [start, end] = edge.points
          return (
            <g key={`${edge.from}-${edge.to}-${index}`}>
              <path
                d={`M ${start.x} ${start.y} C ${start.x} ${(start.y + end.y) / 2}, ${end.x} ${
                  (start.y + end.y) / 2
                }, ${end.x} ${end.y}`}
                fill="none"
                stroke="rgb(255 255 255 / 0.22)"
                strokeWidth="1"
                // A back edge is drawn dashed rather than hidden: it is part of
                // what was described, and omitting it would redraw the graph.
                strokeDasharray={edge.back ? '3 3' : undefined}
                markerEnd={`url(#${arrow})`}
              />
              {/* Beside the line, not across it. Centred on the midpoint the
                  label sat directly on the stroke it belongs to, and the arrow
                  read through the middle of the word. */}
              {edge.label && (
                <text
                  x={(start.x + end.x) / 2 + 5}
                  y={(start.y + end.y) / 2 + 3}
                  textAnchor="start"
                  className="fill-white/45"
                  style={{ fontSize: 7 }}>
                  {clip(edge.label, 14)}
                </text>
              )}
            </g>
          )
        })}

        {layout.nodes.map((node) => {
          const colours = VARIANT[node.variant ?? 'default'] ?? VARIANT.default
          const Icon = node.icon ? ICONS[node.icon] : null
          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx="8"
                fill={colours.fill}
                stroke={colours.stroke}
                strokeWidth="1"
              />
              {Icon && (
                <foreignObject x={node.x + 8} y={node.y + 8} width={14} height={14}>
                  <Icon className="size-3.5 text-white/55" />
                </foreignObject>
              )}
              <text
                x={node.x + (Icon ? 26 : 10)}
                y={node.y + (node.description ? 20 : 27)}
                className="fill-white/90"
                style={{ fontSize: 10, fontWeight: 500 }}>
                {clip(node.label, Icon ? 16 : 19)}
              </text>
              {node.description && (
                <text
                  x={node.x + (Icon ? 26 : 10)}
                  y={node.y + 32}
                  className="fill-white/50"
                  style={{ fontSize: 8 }}>
                  {clip(node.description, Icon ? 20 : 24)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------ the card --- */

const PLATE: Record<NonNullable<FlowNode['variant']>, string> = {
  default: 'bg-[#303030] text-[#c4c4c4]',
  primary: 'bg-[rgba(90,169,255,0.12)] text-[#5aa9ff]',
  success: 'bg-[rgba(94,237,135,0.1)] text-[#5eed87]',
  warning: 'bg-[rgba(240,185,11,0.12)] text-[#f0b90b]',
  danger: 'bg-[rgba(255,138,122,0.12)] text-[#ff8a7a]',
}

/**
 * The nodes in order when the flow is one straight line, else null.
 *
 * A chain (every node has at most one way in and one way out, and every edge
 * points forward) reads best as the design's stacked steps. Anything that
 * branches or loops keeps the laid out graph, which is what can draw it.
 */
export const chainOf = (spec: VisualizationSpec): FlowNode[] | null => {
  if (spec.nodes.length < 2 || spec.edges.length !== spec.nodes.length - 1) return null
  const next = new Map<string, string>()
  const incoming = new Map<string, number>()
  for (const edge of spec.edges) {
    if (next.has(edge.from)) return null
    next.set(edge.from, edge.to)
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1)
  }
  const starts = spec.nodes.filter((node) => !incoming.has(node.id))
  if (starts.length !== 1 || [...incoming.values()].some((count) => count > 1)) return null
  const byId = new Map(spec.nodes.map((node) => [node.id, node]))
  const ordered: FlowNode[] = []
  let cursor: string | undefined = starts[0].id
  while (cursor && ordered.length <= spec.nodes.length) {
    const node = byId.get(cursor)
    if (!node) return null
    ordered.push(node)
    cursor = next.get(cursor)
  }
  return ordered.length === spec.nodes.length ? ordered : null
}

const Step = ({ node, index }: { node: FlowNode; index: number }) => {
  const Icon = node.icon ? ICONS[node.icon] : null
  return (
    <div
      className="card-rise flex items-center gap-3 rounded-xl border border-[#323232] bg-[#242424] p-3"
      style={{ animationDelay: `${0.1 + index * 0.2}s` }}>
      <span
        aria-hidden
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-[11px]',
          PLATE[node.variant ?? 'default'] ?? PLATE.default
        )}>
        {Icon ? (
          <Icon className="size-[18px]" strokeWidth={1.9} />
        ) : (
          <span className="text-13 font-bold tabular-nums">{index + 1}</span>
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-13 font-semibold text-[#ececec]">{clip(node.label, 48)}</span>
        {node.description && (
          <span className="text-11 text-[#9a9a9a]">{clip(node.description, 90)}</span>
        )}
      </span>
      <span className="text-11 ml-auto tabular-nums text-[#9a9a9a]">{index + 1}</span>
    </div>
  )
}

const Connector = ({ label }: { label?: string | null }) => (
  <div className="flex h-[30px] items-center gap-2 pl-[29px]">
    <svg aria-hidden width="12" height="30" viewBox="0 0 12 30">
      <path
        d="M6 0 V24"
        className="card-flow"
        fill="none"
        stroke="#5a5a5a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M2 21 6 26 10 21"
        fill="none"
        stroke="#5a5a5a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    {label && <span className="text-11 text-[#9a9a9a]">{clip(label, 40)}</span>}
  </div>
)

/**
 * A flow, drawn from a spec that had no geometry in it, as a card.
 *
 * The model chose nodes, edges and a direction; everything visual is decided
 * here. Labels come from a model and are rendered as text, never markup.
 */
export const FlowRenderer = ({ spec }: { spec: VisualizationSpec }) => {
  const chain = chainOf(spec)
  const label = (from: string) => spec.edges.find((edge) => edge.from === from)?.label
  return (
    <ResearchCardShell
      title={spec.title}
      subtitle={spec.description ?? undefined}
      icon={
        <IconPlate>
          <Workflow strokeWidth={1.75} />
        </IconPlate>
      }
      trailing={<Chip>{`${spec.nodes.length} steps`}</Chip>}
      footer={
        <CardFooter icon={<Info strokeWidth={1.75} />}>
          A diagram of the steps, not live data.
        </CardFooter>
      }>
      {chain ? (
        <div className="flex flex-col p-3.5">
          {chain.map((node, index) => (
            <div key={node.id} className="flex flex-col">
              <Step node={node} index={index} />
              {index < chain.length - 1 && <Connector label={label(node.id)} />}
            </div>
          ))}
        </div>
      ) : (
        <GraphFlow spec={spec} />
      )}
    </ResearchCardShell>
  )
}
