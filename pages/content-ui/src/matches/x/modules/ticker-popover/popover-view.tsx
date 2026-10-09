import type { ChainId } from '@extension/shared'
import { forwardRef, type CSSProperties, type ReactNode } from 'react'

import { TokenLogo } from './token-logo'

export interface PopoverStat {
  label: string
  value: string
}

export interface PopoverAction {
  label: string
  /** Absent: the button is drawn and does nothing yet. */
  onClick?: () => void
  disabled?: boolean
  title?: string
  primary?: boolean
  /** A stable hook for whoever wires the action later, and for tests. */
  name: string
}

export interface TickerPopoverViewProps {
  symbol: string
  subtitle: string
  logo: string | null | undefined
  chain: ChainId
  dark: boolean
  /** Price per share and its 24h change, or null while there is none to show. */
  price: { value: string; change: string; down: boolean } | null
  stats: PopoverStat[] | null
  /** Said instead of the numbers when there are none: loading, or why not. */
  status: string | null
  chart?: ReactNode
  /** The card on other sites, with a chart: wider than the one on a tweet. */
  wide?: boolean
  actions: PopoverAction[]
  /** The heading is a button only where there is somewhere to go. */
  onHeadingClick?: () => void
  onClose: () => void
  onPointerEnter: () => void
  onPointerLeave: () => void
  style: CSSProperties
}

/**
 * Class names joined in code, not in a `className` template: the Tailwind
 * Prettier plugin trims the whitespace inside those, which turned
 * `is-light has-chart` into `is-lighthas-chart` and the card lost its background.
 */
const classes = (...names: Array<string | false | null | undefined>): string =>
  names.filter(Boolean).join(' ')

/**
 * The hover card, drawn from plain values.
 *
 * Shared by the card on X — where the heading opens the panel — and the card on
 * any other site, which is wider and has a chart. Both have two actions.
 * Data, timers and positioning belong to the caller; this only draws.
 */
export const TickerPopoverView = forwardRef<HTMLDivElement, TickerPopoverViewProps>(
  function TickerPopoverView(
    {
      symbol,
      subtitle,
      logo,
      chain,
      dark,
      price,
      stats,
      status,
      chart,
      wide,
      actions,
      onHeadingClick,
      onClose,
      onPointerEnter,
      onPointerLeave,
      style,
    },
    ref
  ) {
    const heading = (
      <>
        <strong>{symbol}</strong>
        <span>{subtitle}</span>
      </>
    )
    return (
      <div
        ref={ref}
        role="dialog"
        aria-label={`${symbol} market details`}
        className={classes(
          'catalyst-tweet-market-popover',
          dark ? 'is-dark' : 'is-light',
          chart ? 'has-chart' : null,
          wide ? 'is-wide' : null
        )}
        style={style}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}>
        <div className="catalyst-tweet-market-popover-head">
          <TokenLogo logo={logo} symbol={symbol} large chain={chain} />
          {onHeadingClick ? (
            <button
              type="button"
              className="catalyst-tweet-market-heading"
              title="Open the full read"
              onClick={onHeadingClick}>
              {heading}
            </button>
          ) : (
            <div className="catalyst-tweet-market-heading is-static">{heading}</div>
          )}
          <button
            type="button"
            className="catalyst-tweet-market-close"
            aria-label="Close market details"
            onClick={onClose}>
            ×
          </button>
        </div>

        {price && stats ? (
          <>
            <div className="catalyst-tweet-market-price-row">
              <div>
                <span>Price per share</span>
                <strong>{price.value}</strong>
              </div>
              <span className={classes('catalyst-tweet-market-change', price.down && 'is-down')}>
                {price.change}
              </span>
            </div>
            {chart}
            <div className="catalyst-tweet-market-stats">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="catalyst-tweet-market-loading" role="status">
            {status}
          </div>
        )}

        <div
          className={classes('catalyst-tweet-market-actions', actions.length === 1 && 'is-single')}>
          {actions.map((action) => (
            <button
              key={action.name}
              type="button"
              data-action={action.name}
              className={action.primary ? 'is-trade' : undefined}
              disabled={action.disabled}
              title={action.title}
              onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    )
  }
)
