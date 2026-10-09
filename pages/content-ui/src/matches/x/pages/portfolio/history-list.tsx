import { Button } from '@extension/ui'
import type { QueuedPortfolioTradeView } from '@x/modules/portfolio'
import type { PortfolioTrade, PortfolioTradesPage, TradeSide } from '@x/services/catalyst'
import { ExternalLink, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  CHAIN_NAME,
  explorerFor,
  groupByDay,
  logoKey,
  plainAmount,
  quantity,
  stableAmount,
  timeLabel,
} from './format'
import { TokenIcon } from './token-icon'
import { useOpenToken } from './use-open-token'
import type { HeldToken } from './use-open-token'

type LogoFor = (chain: PortfolioTrade['chain'], tokenAddress: string) => string | undefined

const SidePill = ({ side }: { side: TradeSide }) => (
  <span
    className={`text-10 flex h-[18px] items-center rounded-full px-[7px] font-bold uppercase tracking-[0.06em] ${side === 'buy' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
    {side}
  </span>
)

const ROW =
  'grid min-h-16 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 transition-colors'

/**
 * The left of a row: the token, which opens its page. The right stays the
 * explorer link, so a row has two targets rather than one that guesses.
 */
const TokenCell = ({
  token,
  logo,
  side,
  children,
}: {
  token: HeldToken
  logo?: string
  side?: TradeSide
  children: ReactNode
}) => {
  const openToken = useOpenToken()
  return (
    <button
      type="button"
      onClick={() => openToken(token)}
      className="group col-span-2 grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-3 text-left">
      <TokenIcon ticker={token.ticker} chain={token.chain} logo={logo} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="text-14 text-foreground font-semibold group-hover:underline">
            {token.ticker}
          </span>
          {side && <SidePill side={side} />}
        </span>
        <span className="text-12 text-faint truncate tabular-nums">{children}</span>
      </span>
    </button>
  )
}

const TradeRow = ({ trade, logo }: { trade: PortfolioTrade; logo?: string }) => {
  const isBuy = trade.side === 'buy'
  const explorer = explorerFor(trade.chain)
  return (
    <div className={`${ROW} border-b border-white/[0.05] hover:bg-white/[0.02]`}>
      <TokenCell token={trade} logo={logo} side={trade.side}>
        {timeLabel(new Date(trade.executed_at))} · {isBuy ? 'paid' : 'received'}{' '}
        {stableAmount(trade.quote_amount)} {trade.quote_asset}
      </TokenCell>
      <a
        href={explorer.tx(trade.transaction_id)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${isBuy ? 'Buy' : 'Sell'} ${trade.ticker} on ${CHAIN_NAME[trade.chain]}, view on ${explorer.name}`}
        className="group/tx flex flex-col items-end gap-1">
        <span
          className={`text-13 tabular-nums ${isBuy ? 'text-foreground' : 'text-secondary-foreground'}`}>
          {isBuy ? '+' : '−'}
          {quantity(trade.token_amount)}
        </span>
        <span className="text-11 text-faint group-hover/tx:text-secondary-foreground inline-flex items-center gap-1 transition-colors">
          {explorer.name}
          <ExternalLink className="size-2.5" aria-hidden="true" />
        </span>
      </a>
    </div>
  )
}

const queuedDetail = (item: QueuedPortfolioTradeView): string => {
  const waiting = item.status === 'failed' ? 'retrying the sync' : 'waiting for the block'
  if (!item.preview) return waiting
  const { side, amount, asset } = item.preview
  return side === 'buy'
    ? `Paid ${stableAmount(amount)} ${asset} · ${waiting}`
    : `Selling ${plainAmount(amount)} ${asset} · ${waiting}`
}

/** A swap that is on chain but not in the portfolio yet. */
const QueuedRow = ({ item, logo }: { item: QueuedPortfolioTradeView; logo?: string }) => {
  const explorer = explorerFor(item.chain)
  return (
    <div className={`${ROW} border-warning/20 bg-warning/[0.06] rounded-xl border px-3`}>
      <TokenCell token={item} logo={logo} side={item.preview?.side}>
        {queuedDetail(item)}
      </TokenCell>
      <a
        href={explorer.tx(item.transaction_id)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${item.ticker} on ${CHAIN_NAME[item.chain]}, still confirming, view on ${explorer.name}`}
        className="text-11 text-warning inline-flex items-center gap-1 hover:underline">
        <LoaderCircle className="size-2.5 animate-spin" aria-hidden="true" />
        {item.status === 'failed' ? 'Retrying' : 'Pending'}
      </a>
    </div>
  )
}

const GroupLabel = ({ children, tone = 'text-faint' }: { children: string; tone?: string }) => (
  <span className={`text-11 pb-1 pt-3.5 font-semibold uppercase tracking-[0.04em] ${tone}`}>
    {children}
  </span>
)

export const HistoryList = ({
  page,
  isPending,
  isError,
  queued,
  logoFor,
  fetching,
  onPage,
}: {
  page: PortfolioTradesPage | undefined
  isPending: boolean
  isError: boolean
  queued: QueuedPortfolioTradeView[]
  logoFor: LogoFor
  fetching: boolean
  onPage: (next: number) => void
}) => {
  const groups = page ? groupByDay(page.items, (trade) => new Date(trade.executed_at)) : []
  const first = page && page.total > 0 ? (page.page - 1) * page.page_size + 1 : 0
  const last = page ? Math.min(page.page * page.page_size, page.total) : 0
  return (
    <div role="tabpanel" aria-label="Transactions" className="flex flex-col">
      {queued.length > 0 && (
        <div className="flex flex-col gap-2">
          <GroupLabel tone="text-warning">Confirming</GroupLabel>
          {queued.map((item) => (
            <QueuedRow
              key={`${item.chain}:${item.transaction_id}`}
              item={item}
              logo={logoFor(item.chain, item.token_address)}
            />
          ))}
        </div>
      )}
      {isPending ? (
        <div className="flex flex-col gap-3 py-4">
          <div className="h-12 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="h-12 animate-pulse rounded-lg bg-white/[0.06]" />
        </div>
      ) : isError ? (
        <p className="text-12 text-faint py-6 text-center">
          Trade history is unavailable right now.
        </p>
      ) : groups.length ? (
        groups.map((group) => (
          <div key={group.label} className="flex flex-col">
            <GroupLabel>{group.label}</GroupLabel>
            {group.items.map((trade) => (
              <TradeRow
                key={`${trade.chain}:${trade.transaction_id}`}
                trade={trade}
                logo={page?.logos[logoKey(trade.chain, trade.token_address)]}
              />
            ))}
          </div>
        ))
      ) : (
        !queued.length && (
          <p className="text-12 text-faint py-6 text-center">No recorded trades yet.</p>
        )
      )}
      {page && page.total > page.page_size && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-11 text-faint tabular-nums">
            {first}–{last} of {page.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page.page <= 1 || fetching}
              onClick={() => onPage(page.page - 1)}>
              Newer
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={last >= page.total || fetching}
              onClick={() => onPage(page.page + 1)}>
              Older
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
