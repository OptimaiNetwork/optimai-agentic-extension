import { isDarkPage } from '@x/modules/ticker-popover/theme'
import type { Candle } from '@x/services/catalyst'
import {
  AreaSeries,
  createChart,
  HistogramSeries,
  LineStyle,
  LineType,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'

import { trendColour, withAlpha } from './trend'

const HEIGHT = 240

/** How far the card sits from the crosshair, and from the edges it must not cross. */
const TOOLTIP_OFFSET = 12
const TOOLTIP_MARGIN = 8

/**
 * Enough decimals for the price to be a price.
 *
 * A $224 token needs two; a $0.09 one needs five, and rounding it to `$0.09`
 * hides the whole move the chart is drawing.
 */
const priceText = (value: number): string => {
  const places = Math.abs(value) >= 1 ? 2 : Math.abs(value) >= 0.01 ? 4 : 6
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  })}`
}

const volumeText = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

/**
 * What one bar covers, read off the data rather than passed in.
 *
 * The label has to say it. CMC writes "Vol 24h" because each of its bars is a
 * day; ours is whatever the selected range asked the server for, and calling an
 * hour of volume "24h" is exactly the kind of mislabelling this panel keeps
 * finding in other people's payloads.
 */
const intervalLabel = (candles: Candle[]): string => {
  if (candles.length < 2) return ''
  const seconds = (Date.parse(candles[1].open_time) - Date.parse(candles[0].open_time)) / 1000
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  // 5- and 15-minute candles round to "0h" in hours.
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const hours = Math.round(seconds / 3600)
  return hours >= 24 ? `${Math.round(hours / 24)}d` : `${hours}h`
}

/**
 * The token's price, drawn the way X draws its own stock card.
 *
 * One line in one colour — green if the window closed up, red if down — over a
 * fill that fades to the bottom edge, with volume as neutral bars beneath. No
 * axes and no grid: date, time, price and volume are in the tooltip under the
 * pointer. It was a baseline chart, green above the first close and red below,
 * with both axes labelled; the product owner asked for X's look, and a
 * two-colour line split one move into two.
 *
 * It used to shade the hours the underlying exchange was shut, behind the
 * price, with the volume bars greyed over the same stretch. Two things said
 * one thing, and the thing they said is not what this chart is about: the token
 * trades around the clock, so the line is continuous whether or not NASDAQ is
 * open, and banding the background implied a gap the data does not have. The
 * session is reported in words above the chart instead, where it can say
 * "closed, reopens in 6 hours" rather than draw a grey rectangle.
 */
export const Chart = ({
  candles,
  height = HEIGHT,
  dark: darkSurface,
}: {
  candles: Candle[]
  height?: number
  /**
   * Set when the chart sits on a surface of our own rather than in the page's
   * flow. Our trade panel is black on every site, and reading the page there
   * paints Wikipedia's dark-on-white axes onto it: invisible.
   */
  dark?: boolean
}) => {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = host.current
    if (!element || candles.length < 2) return

    const dark = darkSurface ?? isDarkPage()
    const colour = trendColour(candles)
    // Binance reports 0 volume on every Ondo candle: its series is a quoted
    // price, not trades. Bars of nothing and a "Volume $0" row would say the
    // token did not trade, which is not what the zero means, so no volume at all.
    const hasVolume = candles.some((candle) => Number(candle.volume) > 0)
    // lightweight-charts paints onto a canvas and the tooltip is built by hand,
    // so both need a real font stack -- `inherit` means nothing there. Read back
    // the one the surrounding card already resolved rather than naming another.
    const fontFamily = getComputedStyle(element).fontFamily

    // Drawn the way X draws its own card: no axes, no grid, one line in one
    // colour with its fill fading all the way down. The numbers the axes used to
    // carry are in the tooltip, where the pointer is.
    const chart = createChart(element, {
      height,
      layout: {
        background: { color: 'transparent' },
        fontFamily,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: {
        visible: false,
        // The line keeps clear of the volume bars under it, when there are any.
        scaleMargins: { top: 0.08, bottom: hasVolume ? 0.22 : 0.06 },
      },
      timeScale: { visible: false, borderVisible: false, rightOffset: 0.5 },
      crosshair: {
        horzLine: { visible: false, labelVisible: false },
        vertLine: {
          color: dark ? 'rgba(231, 233, 234, 0.35)' : 'rgba(15, 20, 25, 0.28)',
          width: 1,
          style: LineStyle.Dashed,
          labelVisible: false,
        },
      },
      handleScroll: false,
      handleScale: false,
    })

    const series: ISeriesApi<'Area'> = chart.addSeries(AreaSeries, {
      lineColor: colour,
      lineWidth: 2,
      // Drawn through the points as a curve rather than joined corner to
      // corner. Only the drawing: the data and the tooltip keep every close.
      lineType: LineType.Curved,
      // From the top of the chart to its bottom edge, not from the line to the
      // lowest price: the fill runs down behind the volume bars.
      topColor: withAlpha(colour, 0.42),
      bottomColor: withAlpha(colour, 0),
      relativeGradient: false,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: colour,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    })

    series.setData(
      candles.map((candle) => ({
        time: (Date.parse(candle.open_time) / 1000) as UTCTimestamp,
        value: Number(candle.close),
      }))
    )

    // One neutral tone, as on X: a green and a red bar under a one-colour line
    // read as a second chart.
    const volumeTone = dark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(15, 20, 25, 0.14)'
    const volume: ISeriesApi<'Histogram'> | null = hasVolume
      ? chart.addSeries(HistogramSeries, {
          priceScaleId: 'volume',
          color: volumeTone,
          priceFormat: { type: 'volume' },
          priceLineVisible: false,
          lastValueVisible: false,
        })
      : null

    if (volume) {
      chart.priceScale('volume').applyOptions({
        visible: false,
        scaleMargins: { top: 0.84, bottom: 0 },
      })

      volume.setData(
        candles.map((candle) => {
          const traded = Number(candle.volume)
          return {
            time: (Date.parse(candle.open_time) / 1000) as UTCTimestamp,
            value: traded,
            // A zero bar is still drawn a pixel tall; a row of them read as a dashed line.
            ...(traded > 0 ? {} : { color: 'transparent' }),
          }
        })
      )
    }

    chart.timeScale().fitContent()

    /* ---------------------------------------------------------- tooltip --- */

    // Built in JS and styled inline on purpose. This chart renders in two
    // places — the panel's shadow root, which has Tailwind, and a card injected
    // into x.com's own DOM, which has neither Tailwind nor our stylesheet. A
    // class would work in one of them.
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
      `background:${dark ? 'rgba(28,31,38,0.96)' : 'rgba(255,255,255,0.97)'}`,
      `color:${dark ? '#E6E8F0' : '#0f1419'}`,
      `box-shadow:0 8px 24px rgba(0,0,0,${dark ? '0.45' : '0.14'})`,
      `font-family:${fontFamily}`,
      'font-size:11px',
      'line-height:1.45',
    ].join(';')
    element.appendChild(tooltip)

    const bar = intervalLabel(candles)
    const muted = dark ? 'rgba(230,232,240,0.55)' : 'rgba(15,20,25,0.5)'

    const row = (colour: string, label: string, value: string) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">` +
      `<span style="width:7px;height:7px;border-radius:2px;background:${colour};flex:none"></span>` +
      `<span style="color:${muted}">${label}</span>` +
      `<span style="font-weight:600;margin-left:auto">${value}</span></div>`

    chart.subscribeCrosshairMove((param) => {
      const width = element.clientWidth
      if (
        !param.point ||
        param.time === undefined ||
        param.point.x < 0 ||
        param.point.x > width ||
        param.point.y < 0
      ) {
        tooltip.style.display = 'none'
        return
      }

      const price = param.seriesData.get(series) as { value?: number } | undefined
      const traded = volume
        ? (param.seriesData.get(volume) as { value?: number } | undefined)
        : undefined
      if (price?.value === undefined) {
        tooltip.style.display = 'none'
        return
      }

      const at = new Date((param.time as number) * 1000)
      tooltip.innerHTML =
        `<div style="display:flex;gap:12px;color:${muted}">` +
        `<span>${at.toLocaleDateString('en-US')}</span>` +
        `<span style="margin-left:auto">${at.toLocaleTimeString('en-US')}</span></div>` +
        row(colour, 'Price', priceText(price.value)) +
        (traded?.value === undefined
          ? ''
          : row(
              dark ? 'rgba(148,163,184,0.7)' : 'rgba(15,20,25,0.45)',
              bar ? `Volume ${bar}` : 'Volume',
              `$${volumeText.format(traded.value)}`
            ))

      // Measured after the content is in, because the card's width depends on
      // the numbers in it — a $1,809.34 row is wider than a $6.50 one.
      tooltip.style.display = 'block'
      const box = tooltip.getBoundingClientRect()
      const left = Math.min(
        Math.max(TOOLTIP_MARGIN, param.point.x + TOOLTIP_OFFSET),
        Math.max(TOOLTIP_MARGIN, width - box.width - TOOLTIP_MARGIN)
      )
      tooltip.style.transform = `translate(${left}px, ${TOOLTIP_MARGIN}px)`
    })

    const observer = new ResizeObserver(() => chart.applyOptions({ width: element.clientWidth }))
    observer.observe(element)
    chart.applyOptions({ width: element.clientWidth })

    return () => {
      observer.disconnect()
      chart.remove()
      tooltip.remove()
    }
  }, [candles, height, darkSurface])

  return (
    <div
      ref={host}
      className="catalyst-chart"
      aria-label="Price and volume for the window selected above"
      role="img"
    />
  )
}
