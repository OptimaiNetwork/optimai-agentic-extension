import { ScrollArea } from '@extension/ui'
import { describeRequestFailure } from '@x/libs/request-error'
import { retryPortfolioTradeQueue } from '@x/modules/portfolio'
import { probeWallets, useWalletAccount } from '@x/modules/wallet'
import { catalystKeys } from '@x/queries/catalyst/keys'
import {
  usePortfolioHistory,
  usePortfolioStats,
  usePortfolioTrades,
} from '@x/queries/catalyst/use-portfolio'
import type { PortfolioChain, PortfolioHistoryWindow, PortfolioWallets } from '@x/services/catalyst'
import { useQueryClient } from '@tanstack/react-query'
import { Info, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AllocationCard } from './allocation-card'
import { logoKey, plural } from './format'
import { toSamples } from './pnl-series'
import { HistoryList } from './history-list'
import { PerformanceCard } from './performance-card'
import type { PnlTrendView } from './performance-card'
import { PositionList } from './position-list'
import {
  ConnectCard,
  EmptyPortfolio,
  PortfolioError,
  PortfolioSkeleton,
  StaleNotice,
  SyncNotice,
} from './states'
import { useRecordingStatus } from './use-recording-status'
import { WalletStrip } from './wallet-strip'

type Tab = 'assets' | 'transactions'

const TabButton = ({
  selected,
  label,
  count,
  syncing = false,
  onSelect,
}: {
  selected: boolean
  label: string
  count: number
  syncing?: boolean
  onSelect: () => void
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={selected}
    onClick={onSelect}
    className={`text-13 -mb-px flex h-10 items-center gap-1.5 border-b-2 px-3 transition-colors ${selected ? 'text-primary border-primary font-semibold' : 'text-secondary-foreground hover:text-foreground border-transparent'}`}>
    <span>
      {label} <span className="tabular-nums">({count})</span>
    </span>
    {syncing && <span aria-label="Trades syncing" className="bg-warning size-1.5 rounded-full" />}
  </button>
)

const PortfolioPage = () => {
  const accounts = useWalletAccount()
  const bnbWallet = accounts.accounts.evm.status?.address ?? undefined
  const solanaWallet = accounts.accounts.svm.status?.address ?? undefined
  // Every connected wallet at once: the server adds the chains up and sorts
  // their trades together, so this page never picks one.
  const wallets = useMemo<PortfolioWallets>(
    () => ({ bnb: bnbWallet, solana: solanaWallet }),
    [bnbWallet, solanaWallet]
  )
  const hasWallet = Boolean(bnbWallet || solanaWallet)
  const walletCount = [bnbWallet, solanaWallet].filter(Boolean).length
  const stats = usePortfolioStats(wallets)
  const [period, setPeriod] = useState<PortfolioHistoryWindow>('7d')
  const history = usePortfolioHistory(wallets, period)
  const [page, setPage] = useState(1)
  const trades = usePortfolioTrades(wallets, page)
  const recording = useRecordingStatus(wallets)
  const [chosenTab, setChosenTab] = useState<Tab | null>(null)
  const [retryingSync, setRetryingSync] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    probeWallets()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [wallets])

  const summary = stats.data
  const refreshing = stats.isFetching || trades.isFetching
  // With nothing held, the only thing worth looking at is what is on its way.
  const tab: Tab =
    chosenTab ?? (summary && summary.open_position_count === 0 ? 'transactions' : 'assets')
  const isEmpty = summary?.trade_count === 0 && recording.items.length === 0

  const refresh = () => {
    if (!hasWallet) return
    void queryClient.invalidateQueries({ queryKey: catalystKeys.portfolio(wallets) })
  }

  const retrySync = async () => {
    setRetryingSync(true)
    try {
      await retryPortfolioTradeQueue(wallets)
    } finally {
      setRetryingSync(false)
    }
  }

  // Logos come with the data: positions carry their own, a trades page carries
  // one map. A token only in the queue borrows whichever has it.
  const logoFor = useCallback(
    (chain: PortfolioChain, tokenAddress: string) =>
      trades.data?.logos[logoKey(chain, tokenAddress)] ??
      summary?.positions.find((p) => p.chain === chain && p.token_address === tokenAddress)?.logo ??
      undefined,
    [summary, trades.data]
  )

  const failure = stats.error ? describeRequestFailure(stats.error) : null

  // Memoised on the response: the chart redraws when the points change, not on
  // every render of the page around it.
  const samples = useMemo(() => toSamples(history.data?.points ?? []), [history.data])
  const trend: PnlTrendView = {
    samples,
    unpriced: history.data?.unpriced ?? [],
    isPending: history.isPending,
    isError: history.isError,
    isStale: history.isPlaceholderData,
  }

  return (
    <div className="bg-brown/90 flex h-full w-full flex-col border-l border-white/10">
      <ScrollArea className="h-full">
        <main className="mx-auto flex w-full max-w-[470px] flex-col gap-4 px-4 pb-6 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-28 text-foreground font-extrabold leading-tight tracking-tight">
                Portfolio
              </h1>
              <p className="text-12 text-faint">Your on-chain tokenized stock portfolio</p>
            </div>
            {hasWallet && (
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-11 text-secondary-foreground flex items-center gap-1.5">
                  <span aria-hidden="true" className="bg-positive size-[7px] rounded-full" />
                  {plural(walletCount, 'wallet')} connected
                </span>
                <button
                  type="button"
                  aria-label="Refresh portfolio"
                  disabled={refreshing}
                  onClick={refresh}
                  className="text-secondary-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/5 disabled:opacity-60">
                  <RefreshCw
                    className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            )}
          </div>

          {!hasWallet ? (
            <ConnectCard accounts={accounts.accounts} />
          ) : (
            <>
              <WalletStrip accounts={accounts.accounts} />

              {(recording.failed > 0 || recording.unsaved) && (
                <SyncNotice
                  status={recording}
                  retrying={retryingSync}
                  onRetry={() => void retrySync()}
                />
              )}

              {stats.isPending ? (
                <PortfolioSkeleton />
              ) : !summary ? (
                failure && (
                  <PortfolioError
                    failure={failure}
                    retrying={refreshing}
                    onRetry={() => {
                      void stats.refetch()
                      void trades.refetch()
                    }}
                  />
                )
              ) : isEmpty ? (
                <EmptyPortfolio onBrowse={() => navigate('/')} />
              ) : (
                <>
                  {failure && <StaleNotice failure={failure} />}
                  <PerformanceCard
                    stats={summary}
                    trend={trend}
                    period={period}
                    onPeriod={setPeriod}
                  />
                  {summary.open_position_count > 0 && <AllocationCard stats={summary} />}

                  <section className="mt-1 flex flex-col">
                    <div
                      role="tablist"
                      aria-label="Portfolio sections"
                      className="border-border-soft flex gap-2 border-b">
                      <TabButton
                        label="Assets"
                        count={summary.open_position_count}
                        selected={tab === 'assets'}
                        onSelect={() => setChosenTab('assets')}
                      />
                      <TabButton
                        label="Transactions"
                        count={summary.trade_count}
                        syncing={recording.items.length > 0}
                        selected={tab === 'transactions'}
                        onSelect={() => setChosenTab('transactions')}
                      />
                    </div>
                    {tab === 'assets' ? (
                      <PositionList positions={summary.positions} />
                    ) : (
                      <HistoryList
                        page={trades.data}
                        isPending={trades.isPending}
                        isError={trades.isError}
                        queued={recording.items}
                        logoFor={logoFor}
                        fetching={trades.isFetching}
                        onPage={setPage}
                      />
                    )}
                  </section>

                  <p className="border-border-soft text-11 text-secondary-foreground flex items-start gap-2 rounded-lg border px-3 py-2.5 leading-relaxed">
                    <Info className="text-faint mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      P&amp;L uses recorded swaps and excludes network gas. Assets without a price
                      are excluded from holdings value and allocation.
                    </span>
                  </p>
                </>
              )}
            </>
          )}
        </main>
      </ScrollArea>
    </div>
  )
}

export default PortfolioPage
