import { CHAINS, VENUES, isVenueId } from '@extension/shared'
import type { ChainId, VenueId } from '@extension/shared'
import { cn } from '@extension/ui'
import { VenueMark } from '@x/modules/venue/marks'
import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'
import { ChainBadge, TokenLogo } from '@x/pages/home/token-logo'
import { useSelectedChain } from '@x/modules/venue'
import type { ReactNode } from 'react'

/**
 * The frame every research card shares.
 *
 * A header with an identity plate (a ticker letter, an X mark, a shield), a
 * title and a one-line subtitle, then whatever the body draws. The body owns
 * its own padding so a post list can run edge to edge while a number grid
 * keeps the gutter.
 *
 * Limitations are not listed. The server sends up to twelve per card and most
 * of them describe the measurement, not the result — "observed at 14:31:58"
 * is true of every reading and changes nothing for the reader. The one case
 * that does change how a number should be read is a `partial` card, and that
 * gets one amber line naming the first limitation, inside the card it
 * affects, instead of a list of triangles under every card.
 */
export const ResearchCardShell = ({
  title,
  subtitle,
  icon,
  trailing,
  status,
  limitations,
  footer,
  children,
  className,
}: {
  title: string
  subtitle?: string
  /** A 30px plate at the left of the header. */
  icon?: ReactNode
  /** A chip at the right of the header. */
  trailing?: ReactNode
  status?: 'complete' | 'partial' | 'unavailable'
  limitations?: readonly string[]
  /** The one line under the body: where the numbers came from, or how to read them. */
  footer?: ReactNode
  children: ReactNode
  className?: string
}) => {
  const caveat = status === 'partial' ? limitations?.[0] : undefined

  return (
    <article
      aria-label={title}
      data-slot="research-card"
      data-status={status}
      className={cn(
        'card-rise flex w-full flex-col overflow-hidden rounded-2xl border border-[#323232] bg-[#282828] font-normal leading-[1.3] text-[#ececec]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_12px_32px_rgba(0,0,0,0.28)]',
        className
      )}>
      <header className="flex items-center gap-2.5 px-3.5 pt-3.5">
        {icon && (
          <span className="flex size-[30px] shrink-0 items-center justify-center">{icon}</span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="m-0 truncate text-sm font-semibold leading-[18px] text-[#ececec]">
            {title}
          </h3>
          {subtitle && (
            <span className="text-11 truncate leading-[15px] text-[#9a9a9a]">{subtitle}</span>
          )}
        </div>
        {trailing && <span className="flex shrink-0 items-center">{trailing}</span>}
      </header>

      {children}

      {caveat && (
        <div className="text-12 flex items-center gap-2 border-t border-[#323232] bg-[rgba(255,176,0,0.06)] px-3.5 py-2 leading-4 text-[#ffb000]/90">
          <span aria-hidden className="size-[7px] shrink-0 rounded-full bg-[#ffb000]" />
          <span>{caveat}</span>
        </div>
      )}

      {footer}
    </article>
  )
}

/** The 30px plate: a ticker letter on the issuer's colour, or an icon. */
export const CardPlate = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span
    aria-hidden
    className={cn(
      'text-foreground flex size-[30px] items-center justify-center rounded-[10px] bg-black/40',
      className
    )}>
    {children}
  </span>
)

const listingForVenue = (venue?: string | null): { venue: VenueId; chain: ChainId } | undefined => {
  if (!venue) return undefined
  if (venue === 'ondo_bnb') return { venue: 'ondo', chain: 'bnb' }
  if (venue === 'ondo_solana') return { venue: 'ondo', chain: 'solana' }
  if (venue === 'bstock') return { venue: 'bstock', chain: 'bnb' }
  if (venue === 'prestock') return { venue: 'prestock', chain: 'solana' }
  return isVenueId(venue) ? { venue, chain: VENUES[venue].chain } : undefined
}

/** `bstock` → `bStocks`. An unknown venue is shown as sent rather than guessed at. */
export const venueLabel = (venue?: string | null): string | undefined => {
  if (!venue) return undefined
  const listing = listingForVenue(venue)
  return listing ? VENUES[listing.venue].label : venue
}

/** Chain-specific listing keys preserve which Ondo catalog produced the card. */
export const chainLabel = (venue?: string | null): string | undefined =>
  venue && listingForVenue(venue) ? CHAINS[listingForVenue(venue)!.chain].label : undefined

/** The issuer's own mark on a plate, or a lettered fallback for a venue this build lacks. */
export const VenuePlate = ({ venue, className }: { venue: string; className?: string }) => (
  <span
    aria-hidden
    className={cn(
      'flex size-[30px] shrink-0 items-center justify-center rounded-full bg-black/40',
      className
    )}>
    {listingForVenue(venue) ? (
      <VenueMark venue={listingForVenue(venue)!.venue} className="size-4" />
    ) : (
      <span className="text-12 font-extrabold">{venue.slice(0, 1).toUpperCase()}</span>
    )}
  </span>
)

/**
 * The token's real logo, resolved through the same query the ticker page uses,
 * with the first letter standing in until it lands or when the venue has no
 * brand for it. Resolved against the card's own chain-specific listing rather
 * than the panel's selection.
 */
export const TokenMark = ({ ticker, venue }: { ticker: string; venue?: string | null }) => {
  const selection = listingForVenue(venue)
  const activeChain = useSelectedChain()
  const resolved = useResolveCashtag(ticker, { selection })
  const logo = resolved.data?.logo

  if (!logo || !resolved.data) {
    return (
      <ChainBadge chain={selection?.chain ?? activeChain} badgeClassName="size-[9px]">
        <span
          aria-hidden
          className="bg-brand text-brand-foreground text-12 flex size-[30px] shrink-0 items-center justify-center rounded-full font-extrabold">
          {ticker.replace(/^\$/, '').slice(0, 1).toUpperCase()}
        </span>
      </ChainBadge>
    )
  }
  return <TokenLogo token={resolved.data!} className="size-[30px]" />
}
