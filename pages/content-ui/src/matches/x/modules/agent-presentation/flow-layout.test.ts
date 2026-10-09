/**
 * The layout is a pure function, so it can be checked without a browser.
 *
 * What these pin is the part a reader would notice being wrong: ranks that
 * follow the edges, a graph that does not hang on a cycle, and a canvas big
 * enough to contain what was placed on it.
 */

import type { VisualizationSpec } from '@extension/shared'
import { describe, expect, it } from 'vitest'

import { layoutFlow, NODE_HEIGHT, NODE_WIDTH } from './flow-layout'

const spec = (
  nodes: string[],
  edges: [string, string][],
  direction: 'vertical' | 'horizontal' = 'vertical'
): VisualizationSpec => ({
  type: 'flow',
  version: 1,
  title: 'Buying a tokenized share',
  direction,
  nodes: nodes.map((id) => ({ id, label: id })),
  edges: edges.map(([from, to]) => ({ from, to })),
})

const at = (layout: ReturnType<typeof layoutFlow>, id: string) =>
  layout.nodes.find((node) => node.id === id)!

describe('layoutFlow', () => {
  it('places every declared node', () => {
    const layout = layoutFlow(spec(['a', 'b', 'c'], [['a', 'b']]))
    expect(layout.nodes).toHaveLength(3)
  })

  it('puts a successor below its predecessor when the flow is vertical', () => {
    const layout = layoutFlow(
      spec(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['b', 'c'],
        ]
      )
    )
    expect(at(layout, 'b').y).toBeGreaterThan(at(layout, 'a').y)
    expect(at(layout, 'c').y).toBeGreaterThan(at(layout, 'b').y)
  })

  it('puts a successor to the right when the flow is horizontal', () => {
    const layout = layoutFlow(spec(['a', 'b'], [['a', 'b']], 'horizontal'))
    expect(at(layout, 'b').x).toBeGreaterThan(at(layout, 'a').x)
    expect(at(layout, 'b').y).toBe(at(layout, 'a').y)
  })

  it('ranks by the longest path, so a node waits for its slowest input', () => {
    // d must sit below c even though a→d is one hop: the diagram reads as an
    // order, and drawing d beside b would claim it can happen earlier.
    const layout = layoutFlow(
      spec(
        ['a', 'b', 'c', 'd'],
        [
          ['a', 'b'],
          ['b', 'c'],
          ['c', 'd'],
          ['a', 'd'],
        ]
      )
    )
    expect(at(layout, 'd').y).toBeGreaterThan(at(layout, 'c').y)
  })

  it('siblings in one rank do not overlap', () => {
    const layout = layoutFlow(
      spec(
        ['root', 'x', 'y', 'z'],
        [
          ['root', 'x'],
          ['root', 'y'],
          ['root', 'z'],
        ]
      )
    )
    const row = [at(layout, 'x'), at(layout, 'y'), at(layout, 'z')].sort((a, b) => a.x - b.x)
    expect(row[1].x).toBeGreaterThanOrEqual(row[0].x + NODE_WIDTH)
    expect(row[2].x).toBeGreaterThanOrEqual(row[1].x + NODE_WIDTH)
  })

  it('terminates on a cycle instead of hanging the tab', () => {
    // A looping spec is still a drawing somebody asked for. It gets laid out.
    const layout = layoutFlow(
      spec(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['b', 'c'],
          ['c', 'a'],
        ]
      )
    )
    expect(layout.nodes).toHaveLength(3)
    expect(layout.edges).toHaveLength(3)
  })

  it('marks the edge that runs against the order rather than dropping it', () => {
    const layout = layoutFlow(
      spec(
        ['a', 'b'],
        [
          ['a', 'b'],
          ['b', 'a'],
        ]
      )
    )
    expect(layout.edges.filter((edge) => edge.back)).toHaveLength(1)
  })

  it('reports a canvas that contains everything it placed', () => {
    const layout = layoutFlow(
      spec(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['a', 'c'],
        ]
      )
    )
    for (const node of layout.nodes) {
      expect(node.x + NODE_WIDTH).toBeLessThanOrEqual(layout.width)
      expect(node.y + NODE_HEIGHT).toBeLessThanOrEqual(layout.height)
    }
  })

  it('draws an arrow between the box edges, not between their centres', () => {
    const layout = layoutFlow(spec(['a', 'b'], [['a', 'b']]))
    const edge = layout.edges[0]
    expect(edge.points[0].y).toBe(at(layout, 'a').y + NODE_HEIGHT)
    expect(edge.points[1].y).toBe(at(layout, 'b').y)
  })

  it('survives a spec with no edges at all', () => {
    const layout = layoutFlow(spec(['only'], []))
    expect(layout.nodes).toHaveLength(1)
    expect(layout.edges).toHaveLength(0)
  })
})
