import type { ChainId, VenueId } from '@extension/shared'
import { cn } from '@extension/ui'
import { VenueMark } from '@x/modules/venue/marks'
import { NamespaceMark } from '@x/modules/wallet/marks'
import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'

/**
 * The pieces every research card is built from, as drawn on the card design
 * canvas ("Agent research cards"). One place for the palette, the chips, the
 * stat cells and the token and venue marks, so eleven cards read as one family.
 *
 * Colours are the canvas's literal values rather than theme tokens: the canvas
 * is the reference a card is checked against, and a token that drifts would
 * make every card drift with it. Copy avoids dashes on purpose; a missing
 * figure is "N/A", not an em dash.
 */

export const NO_FIGURE = 'N/A'

export const parse = (value?: string | number | null): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** `219.5125` → `$219.51`. */
export const usd = (value?: string | number | null, places = 2): string => {
  const parsed = parse(value)
  if (parsed === null) return NO_FIGURE
  return `$${Math.abs(parsed).toLocaleString('en-US', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  })}`
}

const compactFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

/** `3810000` → `$3.81M`. Scale figures are read for size, not cents. */
export const compactUsd = (value?: string | number | null): string => {
  const parsed = parse(value)
  return parsed === null ? NO_FIGURE : `$${compactFormat.format(Math.abs(parsed))}`
}

/** An unsigned percentage; the direction is carried by an arrow or a word. */
export const pct = (value: number, digits = 2): string => `${Math.abs(value).toFixed(digits)}%`

/** `0.0933852` → `0.093385`. Six places, because 0.44 and 0.437598 are different trades. */
export const quantity = (value?: string | number | null, places = 6): string => {
  const parsed = parse(value)
  return parsed === null
    ? NO_FIGURE
    : parsed.toLocaleString('en-US', { maximumFractionDigits: places })
}

export const time = (iso?: string | null): string | undefined => {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const day = (iso?: string | null): string | undefined => {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ----------------------------------------------------------------- chips --- */

const TONE = {
  neutral: 'bg-[#303030] text-[#c4c4c4]',
  green: 'bg-[rgba(94,237,135,0.1)] text-[#5eed87]',
  amber: 'bg-[rgba(255,176,0,0.1)] text-[#ffb000]',
  coral: 'bg-[rgba(255,138,122,0.1)] text-[#ff8a7a]',
} as const

export type Tone = keyof typeof TONE

export const Chip = ({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone
  icon?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <span
    className={cn(
      'text-11 inline-flex h-[22px] shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full px-2 font-semibold leading-none',
      TONE[tone],
      className
    )}>
    {icon}
    {children}
  </span>
)

/** A dot that breathes: something is live right now. */
export const LiveDot = ({ color }: { color: string }) => (
  <span className="relative inline-flex size-[7px]">
    <span className="card-ping absolute inset-0 rounded-full" style={{ background: color }} />
    <span className="relative size-[7px] rounded-full" style={{ background: color }} />
  </span>
)

/** A move as a chip: a chevron for the direction, the size without a sign. */
export const MoveChip = ({ value, className }: { value: number; className?: string }) => {
  const up = value >= 0
  const Icon = up ? ChevronUp : ChevronDown
  return (
    <Chip
      tone={up ? 'green' : 'coral'}
      className={className}
      icon={<Icon className="size-3" strokeWidth={2.4} aria-hidden />}>
      <span className="tabular-nums" aria-label={`${up ? 'up' : 'down'} ${pct(value)}`}>
        {pct(value)}
      </span>
    </Chip>
  )
}

/* ------------------------------------------------------------ text bits --- */

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-[10px] font-semibold uppercase leading-[13px] tracking-[0.08em] text-[#9a9a9a]">
    {children}
  </span>
)

export const Stat = ({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: ReactNode
  valueClassName?: string
}) => (
  <div className="flex min-w-0 flex-col gap-[3px]">
    <span className="text-11 truncate leading-[14px] text-[#9a9a9a]">{label}</span>
    <span
      className={cn(
        'text-13 truncate font-medium tabular-nums leading-[17px] text-[#ececec]',
        valueClassName
      )}>
      {value}
    </span>
  </div>
)

/** The recessed panel a card groups a figure or an illustration in. */
export const Inset = ({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) => (
  <div className={cn('rounded-xl border border-[#323232] bg-[#242424]', className)} style={style}>
    {children}
  </div>
)

export const CardFooter = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <footer className="text-11 flex items-center gap-[7px] border-t border-[#323232] px-3.5 py-2.5 leading-[15px] text-[#9a9a9a]">
    <span className="flex shrink-0 [&_svg]:size-[13px]">{icon}</span>
    <span>{children}</span>
  </footer>
)

/* ----------------------------------------------------------------- plates --- */

const PLATE = {
  neutral: 'bg-[#303030] shadow-[inset_0_0_0_1px_#3d3d3d] text-[#c4c4c4]',
  green: 'bg-[rgba(94,237,135,0.08)] shadow-[inset_0_0_0_1px_rgba(94,237,135,0.3)] text-[#5eed87]',
  blue: 'bg-[rgba(90,169,255,0.1)] shadow-[inset_0_0_0_1px_rgba(90,169,255,0.3)] text-[#5aa9ff]',
  x: 'bg-[#0a0a0a] shadow-[inset_0_0_0_1px_#333333] text-[#ececec]',
} as const

/** The 30px rounded square at the head of a card that is not about one token. */
export const IconPlate = ({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: keyof typeof PLATE
}) => (
  <span
    aria-hidden
    className={cn(
      'flex size-[30px] shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4',
      PLATE[tone]
    )}>
    {children}
  </span>
)

/* ---------------------------------------------------- venues and chains --- */

export interface Listing {
  venue: VenueId
  chain: ChainId
}

/** A card's chain-specific venue key onto the issuer and the chain it lists on. */
export const listingFor = (key?: string | null): Listing | undefined => {
  switch (key) {
    case 'ondo_solana':
      return { venue: 'ondo', chain: 'solana' }
    case 'ondo_bnb':
      return { venue: 'ondo', chain: 'bnb' }
    case 'bstock':
      return { venue: 'bstock', chain: 'bnb' }
    case 'prestock':
      return { venue: 'prestock', chain: 'solana' }
    default:
      return undefined
  }
}

/** How a venue fills an order, in the words its row carries. */
export const routeFor = (key?: string | null): string | undefined => {
  if (key === 'ondo_solana') return 'Jupiter RFQ'
  if (key === 'prestock') return 'Jupiter'
  if (key === 'bstock' || key === 'ondo_bnb') return 'PancakeSwap'
  return undefined
}

export const chainName = (chain?: string | null): string =>
  chain === 'solana' ? 'Solana' : chain === 'bnb' ? 'BNB Chain' : (chain ?? '')

/** A chain's own mark in a dark disc, for the corner of a logo or a chip. */
export const ChainMark = ({ chain, size = 14 }: { chain: ChainId; size?: number }) =>
  chain === 'bnb' ? (
    <span className="flex shrink-0" style={{ width: size, height: size }}>
      <NamespaceMark namespace="evm" className="size-full" />
    </span>
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#161616]"
      style={{ width: size, height: size }}>
      <span className="flex" style={{ width: size * 0.57, height: size * 0.57 }}>
        <NamespaceMark namespace="svm" className="size-full" />
      </span>
    </span>
  )

/** An issuer's mark on a 26px tile, with its chain in the corner. */
export const VenueTile = ({ venueKey, size = 26 }: { venueKey: string; size?: number }) => {
  const listing = listingFor(venueKey)
  return (
    <span
      aria-hidden
      className="relative flex shrink-0 items-center justify-center rounded-lg bg-[#1c1c1c]"
      style={{ width: size, height: size }}>
      {listing ? (
        <VenueMark venue={listing.venue} className="size-[15px]" />
      ) : (
        <span className="text-11 font-bold text-[#c4c4c4]">
          {venueKey.slice(0, 1).toUpperCase()}
        </span>
      )}
      {listing && (
        <span className="absolute -bottom-1 -right-1 flex rounded-full shadow-[0_0_0_2px_#282828]">
          <ChainMark chain={listing.chain} size={13} />
        </span>
      )}
    </span>
  )
}

/* ----------------------------------------------------------------- token --- */

/**
 * A token's real logo in a disc, with its chain in the corner.
 *
 * Resolved through the same query the ticker page and the pills on X use, so
 * it is usually already cached. Until it answers, or when the image fails, the
 * first letter stands in on the brand green.
 */
export const CardToken = ({
  ticker,
  venueKey,
  chain,
  logo: knownLogo,
  size = 30,
}: {
  ticker: string
  venueKey?: string | null
  chain?: ChainId | null
  /** Already resolved by the caller; skips a second lookup. */
  logo?: string | null
  size?: number
}) => {
  const symbol = ticker.replace(/^\$/, '').toUpperCase()
  const listing = listingFor(venueKey)
  const resolved = useResolveCashtag(symbol, {
    selection: listing,
    enabled: knownLogo === undefined,
  })
  const logo = knownLogo === undefined ? (resolved.data?.logo ?? null) : knownLogo
  const [failed, setFailed] = useState<string | null>(null)
  const badgeChain = chain ?? listing?.chain
  const badge = Math.max(11, Math.round(size * 0.47))

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {logo && failed !== logo ? (
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          decoding="async"
          onError={() => setFailed(logo)}
          className="rounded-full bg-white/5 object-contain shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          aria-hidden
          className="bg-brand text-brand-foreground flex items-center justify-center rounded-full font-bold"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}>
          {symbol.slice(0, 1)}
        </span>
      )}
      {badgeChain && (
        <span
          role="img"
          aria-label={chainName(badgeChain)}
          className="absolute -bottom-[3px] -right-[3px] flex rounded-full shadow-[0_0_0_2px_#282828]">
          <ChainMark chain={badgeChain} size={badge > 14 ? 14 : badge} />
        </span>
      )}
    </span>
  )
}
