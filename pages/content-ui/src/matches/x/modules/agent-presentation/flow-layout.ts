/**
 * Where the boxes go, computed from a spec that contains no coordinates.
 *
 * The contract the server is held to is that a model never emits geometry:
 * `VisualizationSpec` carries nodes, edges, a direction and nothing else. So
 * something on this side has to decide positions, and this is it — a pure
 * function, which is what makes the decision testable without a DOM.
 *
 * **Why not Dagre**, which the plan named. Dagre is a full Sugiyama
 * implementation with crossing minimisation, aimed at graphs of hundreds of
 * nodes. The contract caps a flow at 16 nodes and 24 edges, which is small
 * enough that layered ranking plus barycentre ordering — the code below —
 * places them the same way for the shapes this product draws, and it avoids
 * shipping a graph library into a content script that runs inside every x.com
 * tab under MV3's CSP. If flows ever grow past this cap, that trade flips and
 * Dagre is the right answer.
 *
 * Cycles are ranked rather than rejected. A spec whose edges loop is still a
 * drawing somebody asked for; the back edge is laid out against the rank order
 * and drawn, rather than the whole card being refused over it.
 */

import type { FlowEdge, FlowNode, VisualizationSpec } from '@extension/shared'

export const NODE_WIDTH = 132
export const NODE_HEIGHT = 46
const RANK_GAP = 34
const SIBLING_GAP = 16
const PADDING = 8

export interface PlacedNode extends FlowNode {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface PlacedEdge extends FlowEdge {
  /** Start and end points, already at the box edges the arrow should touch. */
  readonly points: readonly { readonly x: number; readonly y: number }[]
  /** True when the edge runs against the rank order — drawn, not hidden. */
  readonly back: boolean
}

export interface FlowLayout {
  readonly width: number
  readonly height: number
  readonly nodes: readonly PlacedNode[]
  readonly edges: readonly PlacedEdge[]
}

/**
 * Longest-path ranking, with back edges ignored for the purpose of ranking.
 *
 * Iterative rather than recursive, and bounded by the node count, so a cycle
 * costs a stable ranking instead of a blown stack in somebody's browser tab.
 */
const rank = (nodes: readonly FlowNode[], edges: readonly FlowEdge[]): Map<string, number> => {
  const ranks = new Map(nodes.map((node) => [node.id, 0]))
  // One pass per node is enough to propagate the longest path through an
  // acyclic graph; a cyclic one stops here rather than spinning.
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let moved = false
    for (const edge of edges) {
      const from = ranks.get(edge.from)
      const to = ranks.get(edge.to)
      if (from === undefined || to === undefined) continue
      if (to < from + 1) {
        ranks.set(edge.to, from + 1)
        moved = true
      }
    }
    if (!moved) break
  }
  return ranks
}

/** Mean rank-position of a node's predecessors, for ordering within a rank. */
const barycentres = (
  layers: string[][],
  edges: readonly FlowEdge[],
  order: Map<string, number>
): void => {
  for (let index = 1; index < layers.length; index += 1) {
    const layer = layers[index]
    const score = new Map<string, number>()
    for (const id of layer) {
      const parents = edges.filter((edge) => edge.to === id).map((edge) => order.get(edge.from))
      const known = parents.filter((value): value is number => value !== undefined)
      // No known parent means nothing to sort toward; keep its current place
      // rather than sorting it to the front and shuffling the rest around it.
      score.set(
        id,
        known.length ? known.reduce((a, b) => a + b, 0) / known.length : layer.indexOf(id)
      )
    }
    layer.sort((a, b) => (score.get(a) ?? 0) - (score.get(b) ?? 0))
    layer.forEach((id, position) => order.set(id, position))
  }
}

export const layoutFlow = (spec: VisualizationSpec): FlowLayout => {
  const horizontal = spec.direction === 'horizontal'
  const ranks = rank(spec.nodes, spec.edges)

  const depth = Math.max(0, ...ranks.values()) + 1
  const layers: string[][] = Array.from({ length: depth }, () => [])
  for (const node of spec.nodes) layers[ranks.get(node.id) ?? 0].push(node.id)

  const order = new Map<string, number>()
  layers[0]?.forEach((id, position) => order.set(id, position))
  barycentres(layers, spec.edges, order)

  const widest = Math.max(1, ...layers.map((layer) => layer.length))
  const across = (index: number, count: number): number => {
    // Centre each layer against the widest one, so a two-box row under a
    // four-box row sits under its middle rather than flush left.
    const span = horizontal ? NODE_HEIGHT + SIBLING_GAP : NODE_WIDTH + SIBLING_GAP
    const offset = ((widest - count) * span) / 2
    return PADDING + offset + index * span
  }
  const along = (rankIndex: number): number =>
    PADDING + rankIndex * ((horizontal ? NODE_WIDTH : NODE_HEIGHT) + RANK_GAP)

  const placed = new Map<string, PlacedNode>()
  layers.forEach((layer, rankIndex) => {
    layer.forEach((id, index) => {
      const node = spec.nodes.find((candidate) => candidate.id === id)
      if (!node) return
      placed.set(id, {
        ...node,
        x: horizontal ? along(rankIndex) : across(index, layer.length),
        y: horizontal ? across(index, layer.length) : along(rankIndex),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })
    })
  })

  const edges: PlacedEdge[] = []
  for (const edge of spec.edges) {
    const from = placed.get(edge.from)
    const to = placed.get(edge.to)
    // Validation already refused edges pointing at undeclared nodes; this is
    // belt and braces against a spec that reached here another way.
    if (!from || !to) continue
    const back = (ranks.get(edge.to) ?? 0) <= (ranks.get(edge.from) ?? 0)
    edges.push({
      ...edge,
      back,
      points: horizontal
        ? [
            { x: from.x + from.width, y: from.y + from.height / 2 },
            { x: to.x, y: to.y + to.height / 2 },
          ]
        : [
            { x: from.x + from.width / 2, y: from.y + from.height },
            { x: to.x + to.width / 2, y: to.y },
          ],
    })
  }

  const nodes = [...placed.values()]
  return {
    width: Math.max(...nodes.map((node) => node.x + node.width), 0) + PADDING,
    height: Math.max(...nodes.map((node) => node.y + node.height), 0) + PADDING,
    nodes,
    edges,
  }
}
