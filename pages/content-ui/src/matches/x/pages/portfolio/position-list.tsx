import { NamespaceMark } from '@x/modules/wallet'
import type { PortfolioPosition } from '@x/services/catalyst'
import { AlertCircle, ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'

import {
  CHAIN_NAME,
  plainAmount,
  pnlTone,
  signedPercent,
  signedUsd,
  usdValue,
  VENUE_LABEL,
} from './format'
import { nextSort, sortPositions } from './position-sort'
import type { PositionSort, SortKey } from './position-sort'
import { TokenIcon } from './token-icon'
import { useOpenToken } from './use-open-token'

const COLUMNS = 'grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_96px_100px]'

const HEADERS: Array<{ key: SortKey; label: string; end?: boolean }> = [
  { key: 'token', label: 'Token' },
  { key: 'chain', label: 'Chain / Issuer' },
  { key: 'value', label: 'Market value', end: true },
  { key: 'pnl', label: 'Unrealized P&L', end: true },
]

const SortIcon = ({ sort, column }: { sort: PositionSort | null; column: SortKey }) => {
  if (sort?.key !== column) return <ChevronsUpDown className="size-2.5 shrink-0 opacity-70" />
  const Arrow = sort.direction === 'asc' ? ArrowUp : ArrowDown
  return <Arrow className="text-foreground size-2.5 shrink-0" />
}

const HeaderRow = ({
  sort,
  onSort,
}: {
  sort: PositionSort | null
  onSort: (key: SortKey) => void
}) => (
  <div className={`grid ${COLUMNS} border-border-soft gap-2 border-b py-2`}>
    {HEADERS.map((header) => {
      const active = sort?.key === header.key
      const order = active && sort ? (sort.direction === 'asc' ? 'ascending' : 'descending') : null
      return (
        <button
          key={header.key}
          type="button"
          onClick={() => onSort(header.key)}
          aria-label={`Sort by ${header.label}${order ? `, ${order}` : ''}`}
          className={`text-11 flex min-w-0 items-center gap-1 transition-colors ${header.end ? 'justify-end' : ''} ${active ? 'text-foreground' : 'text-faint hover:text-secondary-foreground'}`}>
          <span className="truncate">{header.label}</span>
          <SortIcon sort={sort} column={header.key} />
        </button>
      )
    })}
  </div>
)

const PnlCell = ({ position }: { position: PortfolioPosition }) => {
  if (position.market_value == null) {
    return (
      <span className="flex flex-col items-end gap-0.5">
        <span className="text-12 text-faint">—</span>
        <span className="text-10 text-warning flex items-center gap-1 whitespace-nowrap">
          <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
          Price unavailable
        </span>
      </span>
    )
  }
  const tone = pnlTone(position.unrealized_pnl)
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className={`text-12 font-semibold tabular-nums ${tone}`}>
        {signedUsd(position.unrealized_pnl)}
      </span>
      <span className={`text-11 tabular-nums ${tone}`}>
        ({signedPercent(position.unrealized_pnl_percent)})
      </span>
    </span>
  )
}

const PositionRow = ({ position }: { position: PortfolioPosition }) => {
  const openToken = useOpenToken()
  const priced = position.market_value != null
  return (
    <li>
      <button
        type="button"
        onClick={() => openToken(position)}
        className={`group grid ${COLUMNS} border-border-soft min-h-14 w-full items-center gap-2 border-b py-2.5 text-left transition-colors hover:bg-white/[0.02]`}>
        <span className="flex min-w-0 items-center gap-2">
          <TokenIcon
            ticker={position.ticker}
            chain={position.chain}
            logo={position.logo}
            badge={false}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-13 text-foreground truncate font-semibold group-hover:underline">
              {position.ticker}
            </span>
            {position.name && <span className="text-11 text-faint truncate">{position.name}</span>}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <NamespaceMark
            namespace={position.chain === 'solana' ? 'svm' : 'evm'}
            className="size-4 shrink-0"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-12 text-foreground truncate">{CHAIN_NAME[position.chain]}</span>
            <span className="text-11 text-faint truncate">{VENUE_LABEL[position.venue]}</span>
          </span>
        </span>
        <span className="flex min-w-0 flex-col items-end gap-0.5">
          <span
            className={`text-12 font-semibold tabular-nums ${priced ? 'text-foreground' : 'text-faint'}`}>
            {priced ? usdValue(position.market_value) : '—'}
          </span>
          <span className="text-11 text-faint max-w-full truncate tabular-nums">
            {plainAmount(position.quantity)} {position.ticker}
          </span>
        </span>
        <PnlCell position={position} />
      </button>
    </li>
  )
}

/** Open positions; any column re-sorts them, and a row opens its token. */
export const PositionList = ({ positions }: { positions: PortfolioPosition[] }) => {
  const [sort, setSort] = useState<PositionSort | null>(null)
  if (!positions.length) {
    return (
      <div role="tabpanel" aria-label="Assets">
        <p className="text-12 text-faint py-6 text-center">
          Nothing held right now. Closed trades stay in Transactions and in realized P&amp;L.
        </p>
      </div>
    )
  }
  return (
    <div role="tabpanel" aria-label="Assets" className="flex flex-col">
      <HeaderRow sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} />
      <ul className="flex flex-col">
        {sortPositions(positions, sort).map((position) => (
          <PositionRow
            key={`${position.chain}:${position.venue}:${position.token_address}`}
            position={position}
          />
        ))}
      </ul>
    </div>
  )
}
