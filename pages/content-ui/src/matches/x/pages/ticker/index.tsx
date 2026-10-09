import { Button, ScrollArea, Spinner } from '@extension/ui'
import { usePanelOpen } from '@x/layouts/global-layout/panel-open'
import { Chart } from '@x/modules/search-card/chart'
import { useCandles } from '@x/queries/catalyst/use-candles'
import { useMarkets } from '@x/queries/catalyst/use-markets'
import { useQuote } from '@x/queries/catalyst/use-quote'
import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'
import { describeRequestFailure, isNotFound } from '@x/libs/request-error'
import { MessageCircle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { useSelection } from '@x/modules/venue'
import { dynamicPaths, PATHS, type TokenNavigationState } from '@x/routers/paths'

import { DivergenceCard } from './divergence-card'
import { MarketsCard } from './markets-card'
import { PriceHeader } from './price-header'
import type { ChartRange } from './range-picker'
import { CHART_RANGES, DEFAULT_RANGE } from './range-picker'
import { ShareFacts } from './share-facts'
import { Statistics } from './statistics'
import { useEntryIntent } from './use-entry-intent'

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-brown/90 flex h-full w-full flex-col border-l border-white/10 shadow-2xl backdrop-blur-lg">
    {children}
  </div>
)

/**
 * Four windows, sized to the words in them.
 *
 * It was a segmented control stretched across the panel, which gave "24h" the
 * same hundred pixels as the chart's whole legend and read as the heaviest
 * thing between the price and the chart. These are four small buttons, and the
 * one in force wears the same brand tint the sort caret and the current page
 * number wear — one way of saying "this one" across the panel.
 */
const RangeTabs = ({
  range,
  onChange,
}: {
  range: ChartRange
  onChange: (next: ChartRange) => void
}) => (
  <div className="flex items-center gap-1">
    {CHART_RANGES.map((option) => (
      <button
        key={option.key}
        type="button"
        aria-pressed={option.key === range.key}
        onClick={() => onChange(option)}
        className={`text-11 rounded-md px-2 py-1 font-medium transition-colors ${
          option.key === range.key
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
        }`}>
        {option.label}
      </button>
    ))}
  </div>
)

interface TickerPageProps {
  /** Off X there is no agent on the page, so there is nothing to ask. */
  canAsk?: boolean
  /** Off X there is no token list behind this page; the panel's × closes it. */
  canGoBack?: boolean
}

const TickerPage = ({ canAsk = true, canGoBack = true }: TickerPageProps) => {
  const { cashtag = '' } = useParams<{ cashtag: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const selection = useSelection()
  const panelOpen = usePanelOpen()
  const [range, setRange] = useState<ChartRange>(DEFAULT_RANGE)

  const target = (location.state ?? {}) as TokenNavigationState

  const selectionReady = useEntryIntent(cashtag, target)

  // Two steps on purpose: whatever X wrote — $NVDA, $NVDAx, $NVDAB — has to
  // become the one token with a market before anything can be priced.
  const resolved = useResolveCashtag(cashtag, { enabled: selectionReady })
  // Stops polling when the panel is shut; the route stays mounted behind it.
  const quote = useQuote(resolved.data?.ticker, { active: panelOpen })
  const candles = useCandles(resolved.data?.ticker, range.interval, range.limit)
  // Gated on `panelOpen` like the quote, because this one polls too: these are
  // prices, and a route left behind a closed panel would refresh them for the
  // life of the tab.
  const markets = useMarkets(resolved.data?.ticker, { active: panelOpen })
  const tradeAvailable = quote.data
    ? quote.data.trade_capability
      ? quote.data.trade_capability.status === 'available'
      : quote.data.tradability !== 'unavailable'
    : false

  // `isPending` stays true forever on a disabled query, so once resolve fails the
  // spinner rendered above the error message for the rest of the session.
  const isLoading = !selectionReady || resolved.isLoading || (resolved.isSuccess && quote.isLoading)

  // One navigation behind both Buy buttons — the one beside the price and the
  // one pinned at the foot of the page. Two call sites that drifted apart would
  // be two different purchases from one screen.
  const openBuy = useCallback(() => {
    const ticker = quote.data?.ticker
    if (!ticker) return
    navigate(dynamicPaths.buy(ticker), {
      state: { venue: selection.venue, chain: selection.chain },
    })
  }, [navigate, quote.data?.ticker, selection.chain, selection.venue])

  return (
    <Shell>
      <ScrollArea className="w-full flex-1 p-3">
        {isLoading && (
          <div className="flex min-h-[180px] items-center justify-center">
            <Spinner className="text-primary" />
          </div>
        )}

        {/* A miss and a failure are different answers. Only a 404 means the
            catalog looked and this token is not there; every other error —
            including a backend that is not running — is about the request, and
            reading it as "not available on this issuer" turned an outage into a
            verdict about the token. */}
        {resolved.isError && isNotFound(resolved.error) && (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-13 text-foreground">Not available on this issuer</p>
            <p className="text-11 text-muted-foreground leading-relaxed">
              This token is not available in the selected issuer and chain, so there is nothing here
              to show you.
            </p>
          </div>
        )}

        {resolved.isError && !isNotFound(resolved.error) && (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-13 text-foreground">
              {describeRequestFailure(resolved.error).title}
            </p>
            <p className="text-11 text-muted-foreground leading-relaxed">
              {describeRequestFailure(resolved.error).detail}
            </p>
            <Button variant="outline" size="sm" onClick={() => resolved.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {quote.isError && !resolved.isError && (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-13 text-foreground">Could not read the price</p>
            <p className="text-11 text-muted-foreground leading-relaxed">
              {describeRequestFailure(quote.error).detail}
            </p>
            <Button variant="outline" size="sm" onClick={() => quote.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {quote.data && (
          <div className="space-y-3">
            <PriceHeader
              quote={quote.data}
              token={resolved.data ?? undefined}
              onBack={canGoBack ? () => navigate(target.returnPath ?? PATHS.HOME) : undefined}
              onBuy={openBuy}
            />

            <RangeTabs range={range} onChange={setRange} />

            {candles.data ? (
              // The panel is dark on every page and in either X theme; reading
              // the page behind it drew X-light's dark axes onto it.
              <Chart candles={candles.data.candles} dark />
            ) : (
              <div className="flex h-[240px] items-center justify-center">
                {/* "No candles for this window" is a claim about the window.
                    A request that failed has not established that. */}
                {candles.isError ? (
                  <p className="text-11 text-muted-foreground px-4 text-center leading-relaxed">
                    {isNotFound(candles.error)
                      ? 'No candles for this window.'
                      : describeRequestFailure(candles.error).detail}
                  </p>
                ) : (
                  <Spinner className="text-primary" />
                )}
              </div>
            )}

            {/* Directly under the chart, above everything else the page knows:
                this pair is what the product is for. */}
            <DivergenceCard quote={quote.data} />

            <Statistics quote={quote.data} />

            {/* Under the token's own numbers and above the company's, because
                that is what it is: a fact about this token's markets on this
                chain, not about the business. */}
            <MarketsCard
              snapshot={markets.data}
              isLoading={markets.isPending}
              isError={markets.isError}
              onRetry={() => void markets.refetch()}
            />

            {quote.data.fundamentals && (
              <ShareFacts
                fundamentals={quote.data.fundamentals}
                referencePrice={quote.data.reference_price}
                ticker={quote.data.ticker}
                holders={null}
                traders={quote.data.binance_traders}
              />
            )}
          </div>
        )}
      </ScrollArea>

      {quote.data && (
        <div className="flex flex-shrink-0 items-center gap-2 border-t border-white/10 p-3">
          <Button
            variant="primary"
            size="default"
            className="flex-1"
            disabled={!tradeAvailable}
            onClick={openBuy}>
            {tradeAvailable
              ? `Buy ${quote.data.symbol}`
              : (quote.data.trade_capability?.reason ?? 'Trading unavailable')}
          </Button>
          {canAsk && (
            <Button
              variant="outline"
              size="default"
              aria-label={`Ask about ${quote.data.ticker}`}
              className="shrink-0 gap-2"
              onClick={() =>
                // Context, not a prompt. The composer arrives empty and the
                // user writes and sends the question themselves.
                navigate(dynamicPaths.agent(), {
                  state: {
                    ticker: quote.data.ticker,
                    symbol: quote.data.symbol,
                    returnPath: dynamicPaths.token(quote.data.ticker),
                    requestId: `${quote.data.ticker}-${Date.now()}`,
                    venue: selection.venue,
                    chain: selection.chain,
                  },
                })
              }>
              <MessageCircle className="size-3.5" />
              Ask
            </Button>
          )}
        </div>
      )}
    </Shell>
  )
}

export default TickerPage
