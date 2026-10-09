import type { RequestFailure } from '@x/libs/request-error'
import type { PortfolioRecordingStatus } from '@x/modules/portfolio'
import { connect, NamespaceMark } from '@x/modules/wallet'
import type { AccountState, WalletNamespace } from '@x/modules/wallet'
import { AlertCircle, Plus, RefreshCw } from 'lucide-react'

import { CHAIN_NAME, plural } from './format'

const CARD = 'bg-surface border-border-soft rounded-16 flex flex-col border'
const BAR = 'rounded-md bg-white/[0.07] animate-pulse'

export const PortfolioSkeleton = () => (
  <div aria-busy="true" aria-label="Loading portfolio" className="flex flex-col gap-4">
    <div className={`${CARD} gap-4 p-5`}>
      <div className="grid grid-cols-[minmax(0,1.3fr)_1px_minmax(0,1fr)] items-center gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-12 text-foreground font-semibold">Holdings value</span>
          <span className={`${BAR} h-8 w-36`} />
        </div>
        <span aria-hidden="true" className="bg-border-soft h-14 w-px" />
        <div className="flex flex-col gap-2">
          <span className="text-12 text-secondary-foreground">Total P&amp;L</span>
          <span className={`${BAR} h-6 w-24`} />
        </div>
      </div>
      <div className="border-border-soft flex flex-col gap-2 border-t pt-3.5">
        <span className="text-11 text-faint">P&amp;L over time</span>
        <span className={`${BAR} h-[132px]`} />
      </div>
      <div className="border-border-soft grid grid-cols-3 gap-3.5 border-t pt-3.5">
        <span className={`${BAR} h-9`} />
        <span className={`${BAR} h-9`} />
        <span className={`${BAR} h-9`} />
      </div>
    </div>
    <div className={`${CARD} gap-3.5 p-5`}>
      <span className="text-13 text-foreground font-semibold">Allocation</span>
      <div className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-5">
        <span className="size-[132px] animate-pulse rounded-full border-[18px] border-white/[0.07]" />
        <div className="flex flex-col gap-3">
          <span className={`${BAR} h-3.5`} />
          <span className={`${BAR} h-3.5 w-4/5`} />
          <span className={`${BAR} h-3.5 w-3/5`} />
        </div>
      </div>
    </div>
  </div>
)

const ConnectButton = ({
  namespace,
  account,
  primary,
}: {
  namespace: WalletNamespace
  account: AccountState
  primary: boolean
}) => {
  const chain = CHAIN_NAME[namespace === 'svm' ? 'solana' : 'bnb']
  return (
    <button
      type="button"
      disabled={account.connecting || account.probing}
      onClick={() => void connect(namespace)}
      className={`text-12 flex h-11 items-center gap-2.5 rounded-full pl-2.5 pr-3.5 font-semibold transition-opacity disabled:opacity-50 ${primary ? 'bg-primary text-primary-foreground hover:opacity-90' : 'text-foreground border border-dashed border-white/20 hover:bg-white/5'}`}>
      <NamespaceMark namespace={namespace} className="size-5 shrink-0" />
      <span>{account.connecting ? 'Connecting…' : `Connect ${chain}`}</span>
      <Plus className="ml-auto size-3.5" aria-hidden="true" />
    </button>
  )
}

/** No wallet at all: either chain, or both, fills the portfolio. */
export const ConnectCard = ({ accounts }: { accounts: Record<WalletNamespace, AccountState> }) => (
  <section className={`${CARD} gap-[18px] px-6 py-7`}>
    <div className="flex items-center">
      <NamespaceMark namespace="evm" className="ring-surface size-10 rounded-full ring-[3px]" />
      <span className="ring-surface -ml-2.5 flex size-10 items-center justify-center rounded-full bg-[#1b1b1b] ring-[3px]">
        <NamespaceMark namespace="svm" className="size-[22px]" />
      </span>
    </div>
    <div className="flex flex-col gap-2">
      <h2 className="text-18 text-foreground font-bold tracking-tight">
        Connect a wallet to see your portfolio
      </h2>
      <p className="text-13 text-secondary-foreground leading-relaxed">
        Connect BNB Chain, Solana, or both. Trades on each chain add up into one P&amp;L. Reading an
        address needs no signature.
      </p>
    </div>
    <div className="flex flex-col gap-2">
      <ConnectButton namespace="evm" account={accounts.evm} primary />
      <ConnectButton namespace="svm" account={accounts.svm} primary={false} />
    </div>
  </section>
)

export const EmptyPortfolio = ({ onBrowse }: { onBrowse: () => void }) => (
  <section className={`${CARD} items-start gap-4 px-6 py-7`}>
    <div className="flex flex-col gap-2">
      <h2 className="text-18 text-foreground font-bold tracking-tight">No trades yet</h2>
      <p className="text-13 text-secondary-foreground leading-relaxed">
        Buy a tokenized stock from any $TICKER on X. It lands here once the swap confirms, with its
        cost and live P&amp;L, whichever chain it is on.
      </p>
    </div>
    <button
      type="button"
      onClick={onBrowse}
      className="bg-primary text-primary-foreground text-14 h-11 rounded-full px-5 font-bold transition-opacity hover:opacity-90">
      Browse markets
    </button>
    <p className="text-12 text-faint">Swaps made outside this panel are not imported.</p>
  </section>
)

/** The server's own reason, closed as a sentence so what follows reads as one. */
const sentence = (text: string): string =>
  /[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`

export const PortfolioError = ({
  failure,
  onRetry,
  retrying,
}: {
  failure: RequestFailure
  onRetry: () => void
  retrying: boolean
}) => (
  <section
    role="alert"
    className="border-destructive/30 bg-destructive/[0.06] rounded-16 flex flex-col items-start gap-3.5 border p-6">
    <div className="flex items-center gap-2.5">
      <AlertCircle className="text-destructive size-[18px] shrink-0" aria-hidden="true" />
      <h2 className="text-16 text-foreground font-bold">{failure.title}</h2>
    </div>
    <p className="text-13 text-secondary-foreground leading-relaxed">
      {sentence(failure.detail)} Your trades are on chain and still queued here; the portfolio loads
      as soon as the server answers.
    </p>
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      className="border-border-soft text-13 text-foreground flex h-11 items-center gap-2 rounded-full border px-[18px] font-semibold transition-colors hover:bg-white/5 disabled:opacity-50">
      <RefreshCw className={`size-3.5 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />
      Try again
    </button>
  </section>
)

/** A refresh failed but earlier numbers are on screen: keep them, say they are old. */
export const StaleNotice = ({ failure }: { failure: RequestFailure }) => (
  <p
    role="alert"
    className="border-destructive/25 bg-destructive/[0.06] text-12 text-secondary-foreground flex items-center gap-2 rounded-xl border px-3.5 py-2.5">
    <AlertCircle className="text-destructive size-4 shrink-0" aria-hidden="true" />
    <span>{failure.title}. Showing the last numbers loaded.</span>
  </p>
)

/** Only for trades the queue could not hand over; confirming ones live in Transactions. */
export const SyncNotice = ({
  status,
  onRetry,
  retrying,
}: {
  status: PortfolioRecordingStatus
  onRetry: () => void
  retrying: boolean
}) => {
  const failed = status.items.find((item) => item.status === 'failed')
  const title = status.unsaved
    ? 'Browser storage is unavailable'
    : `${plural(status.failed, 'trade')} ${status.failed === 1 ? "hasn't" : "haven't"} synced yet`
  const detail = status.unsaved
    ? 'Keep this panel open so queued trades can still be recorded.'
    : failed
      ? `${failed.preview?.side === 'sell' ? 'Sell' : 'Buy'} ${failed.ticker} on ${CHAIN_NAME[failed.chain]} · ${(failed.last_error ?? 'no reply').slice(0, 120)}. It keeps retrying on its own.`
      : 'It keeps retrying on its own.'
  return (
    <div
      role="status"
      className="border-warning/20 bg-warning/[0.06] flex items-center gap-3 rounded-xl border py-3 pl-3.5 pr-3">
      <AlertCircle className="text-warning size-[18px] shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-13 text-foreground font-semibold">{title}</span>
        <span className="text-12 text-faint leading-snug">{detail}</span>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="border-warning/40 text-warning text-12 h-11 shrink-0 rounded-full border px-4 font-semibold transition-colors hover:bg-white/5 disabled:opacity-50">
        {retrying ? 'Syncing…' : 'Retry'}
      </button>
    </div>
  )
}
