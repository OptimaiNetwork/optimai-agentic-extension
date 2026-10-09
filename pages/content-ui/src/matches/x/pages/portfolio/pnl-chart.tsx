import type { PortfolioHistoryWindow } from '@x/services/catalyst'
import {
  BaselineSeries,
  createChart,
  CrosshairMode,
  LineStyle,
  LineType,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'

import { signedUsd, usdValue } from './format'
import { describeLine, type PnlSample } from './pnl-series'

const HEIGHT = 132

// The panel's own tokens, spelled out: the chart paints on a canvas, which
// cannot read a Tailwind class. Gain and loss are the colours the P&L figures
// above already wear, so the line and its number read as one thing.
const GAIN = '#00FF88'
const LOSS = '#eb4d4d'
const SURFACE = '#282828'
const INK = '#E6E8F0'
const MUTED = '#8f8f8f'
const HAIRLINE = 'rgba(255, 255, 255, 0.07)'
const ZERO_LINE = 'rgba(255, 255, 255, 0.22)'

const TOOLTIP_OFFSET = 12
const TOOLTIP_MARGIN = 8

const dateTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/**
 * A sample's time on the viewer's own clock.
 *
 * lightweight-charts draws every time as UTC, so its ticks and day breaks
 * landed seven hours off the tooltip in Hanoi. Shifting by the local offset
 * puts the axis on the same clock the tooltip reads.
 */
const onLocalClock = (seconds: number): number =>
  seconds - new Date(seconds * 1000).getTimezoneOffset() * 60

const axisMoney = (value: number): string =>
  Math.abs(value) < 0.005 ? '$0' : signedUsd(String(value))

/** A tooltip row: a short stroke keys it, the value leads, the label follows. */
const tooltipRow = (label: string, keyColour: string | null) => {
  const row = document.createElement('div')
  row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:4px'
  const key = document.createElement('span')
  key.style.cssText = `width:10px;height:2px;border-radius:1px;flex:none;background:${keyColour ?? 'transparent'}`
  const value = document.createElement('span')
  value.style.cssText = `font-weight:600;color:${INK}`
  const name = document.createElement('span')
  name.style.cssText = `color:${MUTED}`
  name.textContent = label
  row.append(key, value, name)
  return { row, key, value }
}

/**
 * Total P&L across the window, on one baseline at zero.
 *
 * Above zero the line and its wash are the gain colour, below it the loss
 * colour, so the sign is read off position as well as hue. There is no legend:
 * the card's title names the one series, and its end is the big number above.
 */
export const PnlChart = ({
  samples,
  period,
  dimmed,
}: {
  samples: PnlSample[]
  period: PortfolioHistoryWindow
  dimmed: boolean
}) => {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = host.current
    if (!element || samples.length < 2) return

    const fontFamily = getComputedStyle(element).fontFamily
    const chart = createChart(element, {
      height: HEIGHT,
      layout: {
        background: { color: 'transparent' },
        textColor: MUTED,
        fontFamily,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: HAIRLINE } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.12 } },
      timeScale: {
        borderVisible: false,
        // Hours on both windows: a 7-day line that starts at the first trade
        // can span a single day, and date-only ticks then read "23 23 23 24".
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      localization: { priceFormatter: axisMoney },
      crosshair: {
        mode: CrosshairMode.Magnet,
        horzLine: { visible: false, labelVisible: false },
        vertLine: { color: 'rgba(255, 255, 255, 0.25)', width: 1, labelVisible: false },
      },
      handleScroll: false,
      handleScale: false,
    })

    const series: ISeriesApi<'Baseline'> = chart.addSeries(BaselineSeries, {
      baseValue: { type: 'price', price: 0 },
      topLineColor: GAIN,
      topFillColor1: 'rgba(0, 255, 136, 0.10)',
      topFillColor2: 'rgba(0, 255, 136, 0.01)',
      bottomLineColor: LOSS,
      bottomFillColor1: 'rgba(235, 77, 77, 0.01)',
      bottomFillColor2: 'rgba(235, 77, 77, 0.10)',
      lineWidth: 2,
      // A curve through the points, like the price charts; the points are unchanged.
      lineType: LineType.Curved,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: SURFACE,
      crosshairMarkerBorderWidth: 2,
    })
    series.setData(
      samples.map((s) => ({ time: onLocalClock(s.time) as UTCTimestamp, value: s.pnl }))
    )
    series.createPriceLine({
      price: 0,
      color: ZERO_LINE,
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: false,
    })
    chart.timeScale().fitContent()

    // Built with DOM nodes and textContent: every string in it is data.
    element.style.position = 'relative'
    const tooltip = document.createElement('div')
    tooltip.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      'z-index:3',
      'pointer-events:none',
      'display:none',
      'padding:8px 10px',
      'border-radius:10px',
      'white-space:nowrap',
      'background:rgba(28,28,28,0.96)',
      'border:1px solid #323232',
      'box-shadow:0 8px 24px rgba(0,0,0,0.45)',
      `font-family:${fontFamily}`,
      'font-size:11px',
      'line-height:1.45',
    ].join(';')
    const when = document.createElement('div')
    when.style.cssText = `color:${MUTED}`
    const pnl = tooltipRow('P&L', GAIN)
    const holdings = tooltipRow('Holdings', null)
    tooltip.append(when, pnl.row, holdings.row)
    element.appendChild(tooltip)

    const byTime = new Map(samples.map((s) => [onLocalClock(s.time), s]))

    chart.subscribeCrosshairMove((param) => {
      const width = element.clientWidth
      const sample = param.time === undefined ? undefined : byTime.get(param.time as number)
      if (!param.point || !sample || param.point.x < 0 || param.point.x > width) {
        tooltip.style.display = 'none'
        return
      }
      when.textContent = dateTime.format(new Date(sample.time * 1000))
      pnl.value.textContent = signedUsd(String(sample.pnl))
      pnl.key.style.background = sample.pnl < 0 ? LOSS : GAIN
      holdings.value.textContent = usdValue(String(sample.holdings))

      tooltip.style.display = 'block'
      const box = tooltip.getBoundingClientRect()
      const left = Math.min(
        Math.max(TOOLTIP_MARGIN, param.point.x + TOOLTIP_OFFSET),
        Math.max(TOOLTIP_MARGIN, width - box.width - TOOLTIP_MARGIN)
      )
      tooltip.style.transform = `translate(${left}px, 0)`
    })

    const observer = new ResizeObserver(() => chart.applyOptions({ width: element.clientWidth }))
    observer.observe(element)
    chart.applyOptions({ width: element.clientWidth })

    return () => {
      observer.disconnect()
      chart.remove()
      tooltip.remove()
    }
  }, [samples, period])

  return (
    <div
      ref={host}
      role="img"
      aria-label={describeLine(samples, period)}
      className={`transition-opacity ${dimmed ? 'opacity-50' : ''}`}
      style={{ height: HEIGHT }}
    />
  )
}

export const PNL_CHART_HEIGHT = HEIGHT
