import type { VenueId } from '@extension/shared'
import { cn } from '@extension/ui'
import { useDismiss } from '@x/layouts/global-layout/use-dismiss'
import type { TradeVenue } from '@x/services/catalyst'
import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { ChainBadge } from './chain-badge'
import { availableTokens, type PaymentToken } from './payment-tokens'
import { PaymentTokenMark } from './token-marks'

/**
 * The payment token, chosen from a menu this panel draws.
 *
 * It was a native `<select>`, which inside a shadow root is the one control the
 * panel cannot style: the closed state took the surrounding pill, and opening
 * it handed the user an OS list rendered at the page's font, in the page's
 * colours, with no mark beside any option — a different product for one click.
 * The panel already owns a dropdown of exactly this shape in
 * `global-layout/chain-switcher.tsx`, including the shadow-boundary dismiss
 * that a naive outside-click check gets wrong, so this is built from the same
 * pieces rather than a second idea about what a menu looks like.
 *
 * `disabled` is real here: a token change re-prices, and a menu that stays live
 * while the new quote is in flight lets a user queue a third order against a
 * second one they cannot see yet.
 */
export const TokenSelect = ({
  value,
  chain,
  venue,
  issuer,
  disabled = false,
  onChange,
}: {
  value: PaymentToken
  chain: 'bnb' | 'solana'
  venue: TradeVenue
  issuer: VenueId
  disabled?: boolean
  onChange: (value: PaymentToken) => void
}) => {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const options = availableTokens(chain, venue, issuer)

  useDismiss(
    open,
    container,
    useCallback(() => setOpen(false), [])
  )

  const choose = (token: PaymentToken) => {
    setOpen(false)
    if (token !== value) onChange(token)
  }

  return (
    <div ref={container} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Pay with ${value}`}
        onClick={() => setOpen((next) => !next)}
        className={cn(
          'flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors',
          'bg-white/[0.06] hover:bg-white/10',
          // Only one option means the menu has nothing to offer: it still shows
          // what is being paid with, and stops pretending to be a choice.
          (disabled || options.length < 2) && 'pointer-events-none',
          disabled && 'opacity-50'
        )}>
        <ChainBadge chain={chain}>
          <PaymentTokenMark token={value} />
        </ChainBadge>
        <span className="text-13 text-foreground font-medium">{value}</span>
        {options.length > 1 && (
          <ChevronDown
            className={cn(
              'text-muted-foreground size-3.5 transition-transform',
              open && 'rotate-180'
            )}
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="rounded-10 bg-brown absolute right-0 top-full z-50 mt-1.5 min-w-[188px] border border-white/10 py-1 shadow-2xl">
          {options.map((option) => (
            <button
              key={option.symbol}
              type="button"
              role="option"
              aria-selected={option.symbol === value}
              onClick={() => choose(option.symbol)}
              className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-white/5">
              <PaymentTokenMark token={option.symbol} className="size-6" />
              <span className="min-w-0 flex-1">
                <span className="text-12 text-foreground block truncate font-medium leading-tight">
                  {option.symbol}
                </span>
                <span className="text-10 text-muted-foreground block truncate leading-tight">
                  {option.name}
                </span>
              </span>
              {option.symbol === value && <Check className="text-primary size-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
