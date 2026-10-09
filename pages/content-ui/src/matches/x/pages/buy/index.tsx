import { CHAINS } from '@extension/shared'
import { Button, cn, ScrollArea, Spinner } from '@extension/ui'
import type { ChainId } from '@x/modules/venue'
import { useSelection, VENUES } from '@x/modules/venue'
import type { WalletNamespace, WalletStatus } from '@x/modules/wallet'
import {
  connectWallet,
  adoptWalletStatus,
  sendTransaction,
  signSolanaTransaction,
  walletErrorMessage,
  walletStatus,
  watchAsset,
} from '@x/modules/wallet'
import { describeRequestFailure, isNotFound } from '@x/libs/request-error'
import { NamespaceMark } from '@x/modules/wallet/marks'
import { TokenLogo } from '@x/pages/home/token-logo'
import { formatUsd } from '@x/pages/ticker/format'
import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'
import { useTradeQuote } from '@x/queries/catalyst/use-trade-quote'
import { useWalletBalance } from '@x/queries/catalyst/use-wallet-balance'
import { enqueuePortfolioTrade } from '@x/modules/portfolio'
import type {
  QuoteVenue,
  SolanaUnsignedTransaction,
  StockToken,
  TradeQuote,
  TradeSide,
  TradeVenue,
  WalletBalance,
} from '@x/services/catalyst'
import { catalystService } from '@x/services/catalyst'
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import type { TokenNavigationState } from '@x/routers/paths'

import type { PaymentToken } from './payment-tokens'
import { ChainBadge } from './chain-badge'
import { readQuoteError, type QuoteError } from './quote-error'
import { ROUTE_LABEL, type RouteId } from './route-marks'
import { SuccessModal } from './success-modal'
import { TokenSelect } from './token-select'
import { useCountdown } from './use-countdown'

type SigningStage = 'approval' | 'swap'
/** After broadcast: waiting for a block, landed, or reverted on-chain. */
type Settlement = 'confirming' | 'settled' | 'reverted'
const RECEIPT_POLL_MS = 3_000
/** Re-reads after a fill, for an RPC node a slot or two behind the one that confirmed it. */
const BALANCE_RETRY_MS = [2_500, 6_000, 12_000]
/** BSC blocks in well under a second; two minutes without one is a stuck transaction. */
const RECEIPT_TIMEOUT_MS = 120_000
type TokenImportState = 'idle' | 'pending' | 'added' | 'declined' | 'failed'

const venueLabel = (venue: QuoteVenue): string => {
  if (venue === 'pancakeswap') return 'PancakeSwap'
  if (venue === 'jupiter') return 'Jupiter'
  return 'BNB Chain'
}

const QUICK_AMOUNTS = ['10', '50', '100'] as const
/** On the sell side the shortcuts are shares of what the wallet holds. */
const QUICK_SHARES = [
  { label: '25%', fraction: 0.25 },
  { label: '50%', fraction: 0.5 },
  { label: 'Max', fraction: 1 },
] as const
const QUOTE_DEBOUNCE_MS = 450

const tokenAmount = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 6,
})

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="bg-brown/90 flex h-full w-full flex-col border-l border-white/10 shadow-2xl">
    {children}
  </div>
)

const formatTokenAmount = (value: string | null | undefined): string => {
  if (value == null) return '—'
  const parsed = Number(value)
  return Number.isFinite(parsed) ? tokenAmount.format(parsed) : value
}

/**
 * What the received side is worth, under the received amount.
 *
 * A buy receives stock tokens, so the figure is their settlement value; a sell
 * receives the settlement token, so the figure is that amount in dollars when
 * it is a stablecoin, and a repeat of the token amount when it is BNB or SOL —
 * the one case where the dollar figure is not something the panel knows.
 */
const quoteValueLabel = (quote: TradeQuote): string => {
  const native = quote.pay_token === 'BNB' || quote.pay_token === 'SOL'
  if (quote.side === 'sell') {
    return native
      ? `${formatTokenAmount(quote.receive_amount)} ${quote.pay_token}`
      : `≈ ${formatUsd(quote.receive_amount)}`
  }
  if (native) {
    return `≈ ${formatTokenAmount(quote.pay_amount)} ${quote.pay_token}`
  }
  const value = Number(quote.receive_amount) * Number(quote.price_per_token)
  return Number.isFinite(value) ? `≈ ${formatUsd(String(value))}` : '—'
}

/**
 * Which chain handed this transaction back.
 *
 * A shape test rather than a flag on the quote: the two are structurally
 * different — one has a `to` to send to, the other a blob to sign — and the
 * signing path has to branch on what it actually holds.
 */
const isSolanaTransaction = (
  transaction: TradeQuote['transaction']
): transaction is SolanaUnsignedTransaction =>
  Boolean(transaction && 'serialized_transaction' in transaction)

const shortAddress = (address: string): string => `${address.slice(0, 6)}…${address.slice(-4)}`

const QuoteErrorNotice = ({ error, onRetry }: { error: QuoteError; onRetry: () => void }) => {
  const Icon = error.tone === 'blocked' ? ShieldAlert : AlertTriangle

  return (
    <div
      role="alert"
      className={`rounded-10 text-11 border p-3 leading-relaxed ${
        error.tone === 'failed'
          ? 'border-destructive/20 bg-destructive/10 text-destructive'
          : 'border-warning/25 bg-warning/10 text-warning'
      }`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-3.5 shrink-0" />
        <div className="min-w-0">
          <p>{error.message}</p>
          {error.hint && <p className="text-10 mt-1.5 opacity-80">{error.hint}</p>}
          {error.retryable && (
            <button
              type="button"
              onClick={onRetry}
              className="text-10 mt-2 font-medium underline underline-offset-2 hover:opacity-80">
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Seconds, or minutes and seconds once there are enough of them.
 *
 * The two venues do not agree on how long a quote lives, and neither publishes
 * a TTL: Jupiter's are about 30 seconds and PancakeSwap's about three minutes,
 * which is where `167s` came from. Nobody reads a hundred and sixty-seven.
 */
/** `0.012424` from `0.012424`, and `10` from `10.000000`. */
const trimZeros = (value: string): string =>
  value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value

const countdown = (seconds: number): string =>
  seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`

const Line = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3 py-1">
    <span className="text-12 text-muted-foreground">{label}</span>
    <span className="text-12 text-foreground max-w-[62%] truncate text-right tabular-nums">
      {value}
    </span>
  </div>
)

const QuoteDetails = ({
  quote,
  seconds,
  repricing,
  showFreshness,
}: {
  quote: TradeQuote
  seconds: number
  repricing: boolean
  showFreshness: boolean
}) => {
  const priceImpact = quote.price_impact_percent
  const hasMaterialImpact = priceImpact != null && Math.abs(Number(priceImpact)) >= 1
  const nativePaymentToken = quote.pay_token === 'BNB' || quote.pay_token === 'SOL'
  const rate = nativePaymentToken
    ? `1 ${quote.symbol} ≈ ${formatTokenAmount(quote.price_per_token)} ${quote.pay_token}`
    : `1 ${quote.symbol} ≈ ${formatUsd(quote.price_per_token)}`

  return (
    <div className="rounded-10 mt-3 bg-white/[0.04] px-3 py-2">
      <Line label="Rate" value={rate} />
      <Line
        label="Minimum received"
        value={`${formatTokenAmount(quote.minimum_received)} ${
          quote.side === 'sell' ? quote.pay_token : quote.symbol
        }`}
      />
      <Line label="Slippage limit" value={`${quote.slippage_percent}%`} />
      {priceImpact != null && (
        <Line label="Price impact" value={`${Number(priceImpact).toFixed(2)}%`} />
      )}

      {/* The clock is a row like the rest, last in the list.
          It was a progress bar heading this card, and before that a number
          inside the confirm button. A bar gave a self-refreshing price the
          visual weight of a deadline; what it actually is, is one more fact
          about this quote, and the four above it are already written as
          label-left, value-right. */}
      {showFreshness && (
        <Line label="Price refreshes in" value={repricing ? 'updating…' : countdown(seconds)} />
      )}

      {hasMaterialImpact && (
        <div className="rounded-10 bg-warning/10 text-12 text-warning mt-2 flex items-start gap-2 px-2.5 py-2 leading-relaxed">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>This order has a higher-than-usual price impact.</span>
        </div>
      )}

      <div className="border-white/8 text-12 text-muted-foreground mt-2 flex items-start gap-2 border-t pt-2 leading-relaxed">
        <ShieldCheck className="text-primary mt-0.5 size-3.5 shrink-0" />
        <span>
          {/* The vendor is dropped when it is the route under another
              capitalisation. Jupiter returns route `JupiterZ` and vendor
              `jupiterz`, which read as "Routed through JupiterZ via jupiterz". */}
          Routed through {quote.route}
          {quote.vendor && quote.vendor.toLowerCase() !== quote.route.toLowerCase()
            ? ` via ${quote.vendor}`
            : ''}
          . Priced by {venueLabel(quote.venue)}.
          {quote.approval && ' A one-time token approval is signed before the swap.'}
        </span>
      </div>
    </div>
  )
}

/**
 * What the wallet holds, and a way to spend all of it.
 *
 * The buy screen asked for an amount with no idea whether the wallet held it,
 * so the first news of an empty balance was a rejected signature — after the
 * person had read a price, a rate and a slippage limit and opened MetaMask.
 *
 * "Max" is the reason this is a button and not a line of text. It is the one
 * amount that is tedious to type and easy to get wrong by a decimal place, and
 * every exchange offers it.
 */
const WalletBalanceLine = ({
  balance,
  loading,
  connected,
  short,
  onUseMax,
}: {
  balance: WalletBalance | undefined
  loading: boolean
  connected: boolean
  /** The order asks for more than this. Say so where the number is. */
  short: boolean
  onUseMax: (amount: string) => void
}) => {
  if (!connected) return null
  if (loading && !balance) {
    return <span className="h-4 w-32 animate-pulse rounded bg-white/[0.08]" aria-hidden="true" />
  }
  if (!balance) return null

  const held = Number(balance.amount)
  return (
    <span
      className={cn(
        // Matches "You pay" opposite it. The two sat on one line at 11px
        // and 13px, which reads as a mistake rather than as a hierarchy.
        'text-14 flex items-center gap-1.5',
        short ? 'text-destructive' : 'text-muted-foreground'
      )}>
      <span className="tabular-nums">
        Balance {formatTokenAmount(balance.amount)} {balance.token}
      </span>
      {Number.isFinite(held) && held > 0 && (
        <button
          type="button"
          onClick={() => onUseMax(balance.amount)}
          className="text-primary hover:bg-primary/15 rounded px-1 py-0.5 font-medium transition-colors">
          Max
        </button>
      )}
    </span>
  )
}

/**
 * The stock token as a chip, the mirror of the payment token's menu.
 *
 * Not a button: there is one stock token on this screen and the previous
 * screen chose it. It sits on whichever side the swap puts it — received on a
 * buy, spent on a sell — so the thing being traded always has a face.
 */
const StockChip = ({
  chain,
  symbol,
  token,
}: {
  chain: ChainId
  symbol: string
  token: StockToken | undefined
}) => (
  <span className="flex shrink-0 items-center gap-2 self-center rounded-full bg-white/[0.06] py-1 pl-1 pr-2.5">
    {token ? (
      <TokenLogo token={token} className="size-6" chain={chain} />
    ) : (
      <ChainBadge chain={chain}>
        <span className="block size-6 animate-pulse rounded-full bg-white/[0.06]" />
      </ChainBadge>
    )}
    <span className="text-13 text-foreground font-medium">{symbol}</span>
  </span>
)

const BuyPage = () => {
  const { cashtag = '' } = useParams<{ cashtag: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  // Set when the agent's confirmation card opened this screen. A prefill only:
  // the quote below is fetched fresh and the wallet still signs.
  const entry = (location.state ?? {}) as TokenNavigationState
  const selection = useSelection()
  const isOndo = selection.venue === 'ondo'
  // No longer forced here: Ondo's only chain is Solana, so the selection already
  // says so. This used to override a BNB Chain selection the catalog offered and
  // the trade route refused.
  const chain: ChainId = selection.chain
  const isSolana = chain === 'solana'
  const tradeUnavailable = isOndo && chain === 'bnb'
  // Route is an issuer policy, not a user preference:
  // bStocks -> PancakeSwap on BNB Chain; Ondo/PreStocks -> Jupiter on Solana.
  const venue: TradeVenue = isSolana ? 'jupiter' : 'pancakeswap'
  // The same value, typed for the mark table rather than for the request.
  const route: RouteId = isSolana ? 'jupiter' : 'pancakeswap'
  // Which of MetaMask's namespaces signs. Derived, never chosen: the chain
  // decides it, and a picker only ever let somebody ask the EVM account to sign
  // a Solana transaction.
  const namespace: WalletNamespace = isSolana ? 'svm' : 'evm'

  // Resolved against the chain that will actually be quoted, not the one the
  // catalog is being browsed on. Reading Ondo on BNB Chain and buying it on
  // Solana are the same screen, and the symbol, decimals and address shown here
  // have to be the ones the trade uses.
  const resolved = useResolveCashtag(cashtag, {
    selection: { venue: selection.venue, chain },
  })
  const ticker = resolved.data?.ticker
  const displayTicker = ticker ?? cashtag.replace(/^\$/, '').toUpperCase()

  const [wallet, setWallet] = useState<WalletStatus | null>(null)
  // Which way the swap goes. Buy is the default because that is what every
  // door into this screen was labelled; the toggle in the header flips it.
  const [side, setSide] = useState<TradeSide>(entry.side ?? 'buy')
  const selling = side === 'sell'
  const [payToken, setPayToken] = useState<PaymentToken>(isSolana ? 'USDC' : 'USDT')
  // `10` is the default this screen has always opened on; an amount arrives
  // only when somebody said one out loud in the agent.
  const [amount, setAmount] = useState(entry.amount ?? '10')
  const [hash, setHash] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signingStage, setSigningStage] = useState<SigningStage | null>(null)
  const [tokenImportState, setTokenImportState] = useState<TokenImportState>('idle')
  const [tokenImportError, setTokenImportError] = useState<string | null>(null)
  const walletAddress = wallet?.address ?? ''

  const quote = useTradeQuote()
  const { data: fresh, error: quoteError, isPending: quotePending, mutate, reset } = quote
  const queryClient = useQueryClient()
  // Every balance this screen might show, thrown away. Called on a fill and
  // on a flip: the wallet has just changed, or the token being asked about
  // has, and a thirty-second cache from before either is the number that put
  // "Balance 0" over a token bought seconds earlier.
  //
  // Read again a few seconds later as well. Jupiter answers /execute the
  // moment the swap confirms, and the RPC the balance comes from is a
  // different node that can be a slot or two behind: one read at that
  // instant came back 0 and sat in the cache as the answer.
  const balanceTimers = useRef<number[]>([])
  const refreshBalances = useCallback(() => {
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['wallet-balance'] })
    invalidate()
    balanceTimers.current.forEach((timer) => window.clearTimeout(timer))
    balanceTimers.current = BALANCE_RETRY_MS.map((delay) => window.setTimeout(invalidate, delay))
  }, [queryClient])
  useEffect(() => () => balanceTimers.current.forEach((timer) => window.clearTimeout(timer)), [])

  const portfolioTrackable = payToken === 'USDT' || payToken === 'USDC'

  const queuePortfolioTrade = useCallback(
    (transactionId: string) => {
      const token = resolved.data
      if (!portfolioTrackable || !ticker || !token || !walletAddress) return
      enqueuePortfolioTrade(
        chain,
        walletAddress,
        {
          transaction_id: transactionId,
          venue: selection.venue,
          ticker,
          token_address: isSolana ? (token.mint ?? token.contract_address) : token.contract_address,
          quote_asset: payToken,
        },
        // Only for the Portfolio row while the swap confirms; the recorded
        // trade carries the amounts the chain says, not these.
        { side, amount, asset: selling ? ticker : payToken }
      )
    },
    [
      amount,
      chain,
      isSolana,
      payToken,
      portfolioTrackable,
      resolved.data,
      selection.venue,
      selling,
      side,
      ticker,
      walletAddress,
    ]
  )

  /**
   * The last quote that arrived, kept on screen while the next one is priced.
   *
   * Every keystroke in the amount field invalidates the quote, and invalidating
   * used to mean `reset()` — which cleared the data, so "You receive" fell back
   * to a dash, the whole details card unmounted, and the page collapsed by
   * about a hundred pixels and sprang back a moment later. Typing `105` did
   * that three times. What the user is looking at is the *shape* of the answer;
   * only the numbers are stale, so the numbers dim and everything else holds
   * its place.
   *
   * Cleared outright only when the order itself changes underneath it — a
   * different ticker, chain or issuer — because then the old numbers are not
   * stale, they are about something else.
   */
  const [shown, setShown] = useState<TradeQuote | null>(null)
  useEffect(() => {
    if (fresh) setShown(fresh)
  }, [fresh])

  /**
   * A failed attempt takes the old quote down with it.
   *
   * Holding the previous numbers is right while the next ones are loading and
   * wrong the moment the answer is "no": the page rendered a complete quote —
   * rate, minimum received, a live countdown — directly above a warning saying
   * the market was shut, and offered a confirm button for a price that had just
   * been refused. Keeping the layout still is not worth showing somebody a
   * price they cannot have.
   */
  useEffect(() => {
    if (quoteError) setShown(null)
  }, [quoteError])

  const quoteData = fresh ?? shown
  // Null unless the last quote failed, so the notice renders on presence and
  // the page never has to decide what a failure without a code means.
  const quoteProblem = readQuoteError(quoteError)
  // The issuer's own symbol, never a guess. The fallback used to append a
  // bStocks "B", so an Ondo screen on Solana promised the user NVDAB.
  const receiveSymbol = resolved.data?.symbol ?? quoteData?.symbol ?? displayTicker
  const secondsLeft = useCountdown(quoteData?.expires_at)
  const expired = Boolean(quoteData) && secondsLeft === 0
  const amountValue = Number(amount)
  const validAmount = Number.isFinite(amountValue) && amountValue > 0
  // Solana has no EVM chain id, so "is it on BSC" is not a question that can be
  // asked of it. Having an account is the whole readiness test there.
  const walletReady = Boolean(walletAddress && (namespace === 'svm' || wallet?.onBsc))

  // On a sell the wallet's relevant holding is the stock token itself, asked
  // for by ticker once the cashtag has resolved to one.
  const balance = useWalletBalance(
    walletAddress || undefined,
    selling ? (ticker ?? '') : payToken,
    {
      venue: selection.venue,
      chain,
    }
  )

  /**
   * What one unit of the payment asset costs, from the balance response.
   *
   * It used to be derived as `usd / amount`, which is undefined for a wallet
   * holding nothing — so an empty BNB wallet got a dash where the dollar figure
   * goes, and the quick-amount buttons had nothing to convert with. The server
   * sends the price separately for exactly that reason.
   */
  const unitPrice = Number(balance.data?.price_usd)
  const hasUnitPrice = Number.isFinite(unitPrice) && unitPrice > 0

  // A stock token's dollar figure comes from the quote when the balance
  // carries no price — bStocks are not priced by the balance endpoint, and
  // the rate the quote just returned is the truer number anyway.
  const quotedRate = Number(quoteData?.price_per_token)
  const sellRate =
    selling && quoteData && !(quoteData.pay_token === 'BNB' || quoteData.pay_token === 'SOL')
      ? quotedRate
      : NaN
  const payUnitPrice = hasUnitPrice ? unitPrice : Number.isFinite(sellRate) ? sellRate : NaN
  const payAmountUsd =
    validAmount && Number.isFinite(payUnitPrice) && payUnitPrice > 0
      ? `\u2248 ${formatUsd(String(amountValue * payUnitPrice))}`
      : null

  /**
   * The three buttons say dollars, so they have to fill in dollars' worth.
   *
   * `$10` set the field to the literal string "10", which is ten dollars of a
   * stablecoin and ten *BNB* — about eight thousand — of anything else. The
   * label was right and the button was wrong, one tap away from a four-figure
   * order. Without a price there is nothing to convert, so they go flat rather
   * than lie.
   */
  const quickAmounts = QUICK_AMOUNTS.map((usd) => ({
    usd,
    fills: hasUnitPrice ? trimZeros((Number(usd) / unitPrice).toFixed(6)) : null,
  }))
  const heldAmount = Number(balance.data?.amount)
  const quickShares = QUICK_SHARES.map(({ label, fraction }) => ({
    label,
    fills:
      Number.isFinite(heldAmount) && heldAmount > 0
        ? fraction === 1
          ? (balance.data?.amount ?? null)
          : trimZeros((heldAmount * fraction).toFixed(6))
        : null,
  }))

  // A quote is tied to both values. Keeping it visible after either changes
  // makes the confirm button look valid while signing a different order.
  const invalidateQuote = useCallback(() => {
    reset()
    setHash(null)
    setSettlement(null)
    setError(null)
    setTokenImportState('idle')
    setTokenImportError(null)
  }, [reset])

  /** Invalidate, and drop what is on screen: this is a different order. */
  const discardQuote = useCallback(() => {
    invalidateQuote()
    setShown(null)
  }, [invalidateQuote])

  useEffect(() => {
    // The route normally remounts after an issuer switch, but keeping this
    // synchronized also makes a future in-place navigation safe: the payment
    // asset cannot remain from the previous chain.
    setPayToken(isSolana ? 'USDC' : 'USDT')
    discardQuote()
  }, [discardQuote, isSolana, selection.venue])

  useEffect(() => {
    // Re-probed when the namespace changes: a status for the EVM account says
    // nothing about whether a Solana one is connected, and showing the first
    // while signing with the second is how an address on screen stops matching
    // the address that signs.
    setWallet(null)
    walletStatus(namespace)
      .then(setWallet)
      .catch(() => setWallet(null))
  }, [namespace])

  const updateAmount = (next: string) => {
    if (!/^\d*\.?\d*$/.test(next)) return
    invalidateQuote()
    setAmount(next)
  }

  const updatePayToken = (next: PaymentToken) => {
    // A different asset is a different order, not a re-price of this one.
    discardQuote()
    setPayToken(next)
  }

  const updateSide = (next: TradeSide) => {
    if (next === side || signing) return
    // The amount was typed in one token and would now mean another: ten USDT
    // is not ten NVDAB. Clear it rather than re-price a number nobody meant.
    discardQuote()
    setAmount('')
    setSide(next)
    refreshBalances()
  }

  const priceIt = useCallback(() => {
    if (tradeUnavailable) return
    if (!ticker || !walletReady || !walletAddress || !validAmount) return

    setError(null)
    setHash(null)
    reset()
    mutate({
      ticker,
      venue,
      side,
      payToken,
      payAmount: amount,
      wallet: walletAddress,
      selection: { venue: selection.venue, chain },
    })
  }, [
    amount,
    chain,
    mutate,
    payToken,
    reset,
    selection.venue,
    side,
    ticker,
    tradeUnavailable,
    validAmount,
    venue,
    walletAddress,
    walletReady,
  ])

  useEffect(() => {
    if (!ticker || !walletReady || !walletAddress || !validAmount) return

    const timer = window.setTimeout(priceIt, QUOTE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [priceIt, ticker, validAmount, walletAddress, walletReady])

  /**
   * A quote that runs out re-prices itself.
   *
   * Binance and Jupiter both mint quotes with about thirty seconds of life, and
   * the page used to let one die and then ask the user to press "Refresh quote"
   * — a button whose only purpose was to undo the passage of time. Someone who
   * looked away for a minute came back to a dead screen and a chore.
   *
   * Not while signing: the wallet is already holding this exact quote, and
   * replacing it underneath an open confirmation dialog is how a user signs one
   * order and sees another. Not after a fill either — `hash` means it is done.
   * And not when the last attempt failed for a reason that will not change,
   * which is what would otherwise turn a rejection into a request loop.
   */
  useEffect(() => {
    if (!expired || signing || hash || quotePending) return
    if (quoteProblem && !quoteProblem.retryable) return
    priceIt()
  }, [expired, hash, priceIt, quotePending, quoteProblem, signing])

  const connect = async () => {
    setError(null)
    try {
      const connected = await connectWallet(namespace)
      adoptWalletStatus(namespace, connected)
      setWallet(connected)
    } catch (caught) {
      setError(walletErrorMessage(caught, 'Could not connect to MetaMask'))
    }
  }

  const requestTokenImport = useCallback(async () => {
    const token = resolved.data
    if (!token) return

    setTokenImportState('pending')
    setTokenImportError(null)
    try {
      const { added } = await watchAsset({
        address: token.contract_address,
        symbol: token.symbol,
        decimals: token.decimals,
        // The panel's logo is usually an inlined data URI for x.com's CSP.
        // MetaMask expects a URL here, so omit non-URL values rather than
        // turning a valid token import into an invalid wallet request.
        image: /^https?:\/\//.test(token.logo ?? '') ? token.logo! : undefined,
      })
      setTokenImportState(added ? 'added' : 'declined')
    } catch (caught) {
      setTokenImportState('failed')
      setTokenImportError(walletErrorMessage(caught, 'MetaMask did not add the token'))
    }
  }, [resolved.data])

  const sign = async () => {
    const prepared = quoteData
    if (!prepared?.transaction || expired) return

    setSigning(true)
    setError(null)
    let failedStage: SigningStage = 'swap'
    try {
      // Solana: the wallet signs and Jupiter broadcasts, so there is no hash
      // until the server has executed it — and no approval step at all, because
      // an SPL transfer needs no allowance.
      if (isSolanaTransaction(prepared.transaction)) {
        setSigningStage('swap')
        const { signedTransaction } = await signSolanaTransaction(
          prepared.transaction.serialized_transaction
        )
        const { data } = await catalystService.tradeExecute(
          {
            signed_transaction: signedTransaction,
            request_id: prepared.transaction.request_id ?? prepared.quote_id,
          },
          { venue: selection.venue, chain }
        )
        // Jupiter reports the fill in `status`; a signature alone can belong to
        // a transaction that landed and failed.
        if (data.status && data.status.toLowerCase() !== 'success') {
          throw new Error(data.error ?? `Jupiter reported the swap as ${data.status}`)
        }
        setHash(data.signature ?? null)
        setSettlement('settled')
        refreshBalances()
        if (data.signature) queuePortfolioTrade(data.signature)
        reset()
        return
      }

      if (prepared.approval) {
        failedStage = 'approval'
        setSigningStage('approval')
        await sendTransaction({
          to: prepared.approval.to,
          data: prepared.approval.data,
          value: '0x0',
        })
      }
      failedStage = 'swap'
      setSigningStage('swap')
      const { hash: sent } = await sendTransaction({
        to: prepared.transaction.to,
        data: prepared.transaction.data,
        value: prepared.transaction.value,
        gas: prepared.transaction.gas ?? undefined,
      })
      setHash(sent)
      queuePortfolioTrade(sent)
      // Broadcast is not a fill. The receipt poll below decides what the
      // hash meant, and the success screen waits for it.
      setSettlement('confirming')
      reset()
    } catch (caught) {
      const stage = failedStage === 'approval' ? 'Token approval failed' : 'Swap failed'
      setError(`${stage}: ${walletErrorMessage(caught, 'The wallet refused the transaction')}`)
    } finally {
      setSigningStage(null)
      setSigning(false)
    }
  }

  /**
   * Wait for the block, then believe the hash.
   *
   * A reverted swap has a hash like any other, and this page used to open its
   * success screen on the hash alone — a seller whose swap failed on-chain was
   * shown "Sale complete" over MetaMask's own "Interaction failed". The receipt
   * is polled until it says one thing or the other; only then is the token
   * import offered, and only on a buy.
   */
  useEffect(() => {
    if (!hash || settlement !== 'confirming' || isSolana) return
    let cancelled = false
    const startedAt = Date.now()
    const check = async () => {
      try {
        const { data } = await catalystService.tradeReceipt(hash, {
          venue: selection.venue,
          chain,
        })
        if (cancelled) return
        if (data.status === 'success') {
          setSettlement('settled')
          refreshBalances()
          queuePortfolioTrade(hash)
          if (!selling) void requestTokenImport()
          return
        }
        if (data.status === 'reverted') {
          setSettlement('reverted')
          setError(
            data.reason
              ? `The swap reverted on BNB Chain: ${data.reason}. Nothing moved; try again for a fresh price.`
              : `The swap was mined but reverted on BNB Chain, so nothing moved. ` +
                  `The route may have changed under the quote; try again for a fresh price.`
          )
          return
        }
      } catch {
        // A receipt that cannot be read yet is the same as one that is pending.
      }
      if (cancelled) return
      if (Date.now() - startedAt > RECEIPT_TIMEOUT_MS) {
        setSettlement('reverted')
        setError(
          'The swap was sent but its receipt could not be read in time. Check BscScan before trying again.'
        )
        return
      }
      timer = window.setTimeout(() => void check(), RECEIPT_POLL_MS)
    }
    let timer = window.setTimeout(() => void check(), RECEIPT_POLL_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    chain,
    hash,
    isSolana,
    refreshBalances,
    requestTokenImport,
    queuePortfolioTrade,
    selection.venue,
    selling,
    settlement,
  ])

  const primaryAction = () => {
    if (!walletReady) {
      void connect()
      return
    }
    if (quoteData && !expired) {
      if (!quoteData.transaction) {
        setError(quoteData.unsignable_reason ?? 'This wallet cannot fund the quoted route')
        return
      }
      void sign()
      return
    }
    if (quoteProblem && !quoteProblem.retryable) return
    priceIt()
  }

  // Re-pricing with an answer already on screen, as opposed to the first quote
  // of the session, which has nothing to hold the layout open.
  const repricing = quotePending && shown != null
  const waitingForPreview =
    walletReady && validAmount && !quoteData && !quoteProblem && !quotePending
  const blockedByQuoteProblem = Boolean(quoteProblem && !quoteProblem.retryable)
  const canRetrySigning = Boolean(error && quoteData && !expired && walletReady)
  const cannotSignQuote = Boolean(quoteData && !quoteData.transaction && !expired)
  const needsBscSwitch = namespace === 'evm' && Boolean(wallet?.address && !wallet.onBsc)

  /**
   * The order is larger than the wallet.
   *
   * Known before anything is signed, and ignored until now: the panel read the
   * balance, printed it above the field, and still handed MetaMask a transfer
   * of 1.1 USDC out of an account holding none. MetaMask cannot say why that
   * fails — it sees a reverted simulation and reports "an unknown error
   * occurred" — so the one place that does know has to say it.
   *
   * Only when the balance is actually known. A wallet whose balance could not
   * be read is not a wallet that is empty, and blocking on a failed request
   * would stop a purchase that would have gone through.
   */
  const held = Number(balance.data?.amount)
  const knowsBalance = Number.isFinite(held)
  const insufficient = knowsBalance && validAmount && amountValue > held

  const primaryLabel = tradeUnavailable
    ? 'Trading unavailable on BNB'
    : !wallet?.address
      ? wallet?.installed === false
        ? 'MetaMask not detected'
        : `Connect ${isSolana ? 'Solana' : 'BNB Chain'} wallet`
      : needsBscSwitch
        ? 'Switch to BNB Chain'
        : settlement === 'confirming'
          ? // Before the balance check: the wallet just spent the amount, so the
            // balance is short by construction while the swap is being mined.
            'Confirming on BNB Chain…'
          : insufficient
            ? `Not enough ${selling ? receiveSymbol : payToken}`
            : signing
              ? signingStage === 'approval'
                ? 'Approve in MetaMask…'
                : 'Confirm swap in MetaMask…'
              : repricing
                ? 'Updating price…'
                : quotePending
                  ? 'Fetching route…'
                  : quoteData && !expired
                    ? cannotSignQuote
                      ? 'Insufficient funds'
                      : canRetrySigning
                        ? 'Try again'
                        : 'Confirm in MetaMask'
                    : expired
                      ? 'Refreshing quote…'
                      : quoteProblem?.retryable
                        ? 'Try again'
                        : blockedByQuoteProblem
                          ? 'Wallet cannot be used'
                          : 'Waiting for quote…'

  const primaryDisabled =
    tradeUnavailable ||
    !ticker ||
    resolved.isPending ||
    !validAmount ||
    quotePending ||
    // An expired quote cannot be signed, and one is already on its way back:
    // the button stays down for that beat rather than offering a click that
    // would be refused.
    expired ||
    insufficient ||
    signing ||
    settlement === 'confirming' ||
    Boolean(hash && settlement === 'settled') ||
    waitingForPreview ||
    cannotSignQuote ||
    blockedByQuoteProblem ||
    wallet?.installed === false

  /**
   * What the modal is told, once there is something to tell it.
   *
   * The received amount comes off the quote that was signed rather than being
   * re-fetched: the fill is that quote, and a fresh one would be a different
   * number on a screen describing a transaction that has already happened.
   */
  const filled =
    hash != null && settlement === 'settled'
      ? { hash, received: quoteData?.receive_amount ?? '0', paid: amount }
      : null

  return (
    <Shell>
      {/* Two lines of grey text and a back arrow, stretched across 500px with
          nothing in the middle — the route read as fine print under a heading
          that repeated the symbol already on the previous screen.

          What a person needs here is the same three answers the confirmation
          dialog will ask them to check: which token, through whose market, on
          which chain. So the token wears its own logo at the size the ticker
          page uses, and the route is three marks and three words rather than a
          sentence of separators. */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/10 px-3 py-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="text-muted-foreground hover:bg-white/8 hover:text-foreground -ml-1 shrink-0 rounded-full p-1 transition-colors">
          <ArrowLeft className="size-4" />
        </button>

        {resolved.data ? (
          <TokenLogo token={resolved.data} />
        ) : (
          <span className="size-8 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
        )}

        <div className="min-w-0 flex-1">
          <div className="text-15 text-foreground truncate font-medium leading-tight">
            {receiveSymbol}
          </div>
          <div className="text-10 text-muted-foreground truncate font-medium uppercase tracking-[0.08em]">
            {side} · {ROUTE_LABEL[route]} · {CHAINS[chain].label}
          </div>
        </div>
      </div>

      <ScrollArea className="w-full flex-1">
        <div className="space-y-3 p-3">
          <div className="relative space-y-2">
            <div className="rounded-16 bg-white/[0.04] p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-14 text-foreground font-medium">
                  {selling ? 'You sell' : 'You pay'}
                </span>
                <WalletBalanceLine
                  balance={balance.data}
                  loading={balance.isLoading}
                  connected={Boolean(walletAddress)}
                  short={insufficient}
                  onUseMax={updateAmount}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <input
                  aria-label="Amount to pay"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => updateAmount(event.target.value.replace(/[^\d.]/g, ''))}
                  className="text-32 text-foreground placeholder:text-muted-foreground/50 min-w-0 flex-1 bg-transparent font-medium tracking-[-0.04em] outline-none"
                  placeholder="0.00"
                />
                {selling ? (
                  <StockChip chain={chain} symbol={receiveSymbol} token={resolved.data} />
                ) : (
                  <TokenSelect
                    value={payToken}
                    chain={chain}
                    venue={venue}
                    issuer={selection.venue}
                    disabled={signing || repricing}
                    onChange={updatePayToken}
                  />
                )}
              </div>

              {/* One dollar figure, always, for whichever asset is selected.
                  It used to print "Native SOL on Solana" for the two tokens
                  whose dollar value is the only thing a buyer cannot work out
                  in their head — a label where the number belonged. */}
              <div className="text-12 text-muted-foreground mt-2">
                {payAmountUsd ?? (amount ? '\u2014' : 'Enter an amount')}
              </div>

              <div className="mt-4 flex gap-1.5">
                {(selling
                  ? quickShares.map(({ label, fills }) => ({ label, fills }))
                  : quickAmounts.map(({ usd, fills }) => ({ label: `$${usd}`, fills }))
                ).map(({ label, fills }) => (
                  <button
                    key={label}
                    disabled={fills == null}
                    onClick={() => fills && updateAmount(fills)}
                    className={cn(
                      'text-11 flex-1 rounded-full py-1.5 font-medium transition-colors',
                      amount === fills
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground bg-white/[0.06] hover:bg-white/10',
                      fills == null && 'cursor-not-allowed opacity-40'
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Anchored to the top edge of the receive card, not to the midpoint
                of both. The two cards are not the same height — the pay card
                carries the quick-amount row — so a midpoint lands inside it,
                which is how the arrow ended up sitting on the $50 button. */}
            <div className="relative">
              {/* `bg-white/10` is a 10% wash, so the receive card's own surface
                  and the $50 button behind it both read straight through the
                  disc. The blur plus an opaque-ish panel tint makes it a thing
                  sitting on top of the cards rather than a hole in them; the
                  ring replaces a 5px `border-brown` that only worked because it
                  happened to match one background. */}
              {/* The arrow is the control. It sits where the two assets meet,
                  and pressing it swaps their places — which is what turning a
                  buy into a sell is. A Buy / Sell segmented control was tried
                  in the header and read as a mode of the screen rather than a
                  direction of the swap. */}
              <button
                type="button"
                onClick={() => updateSide(selling ? 'buy' : 'sell')}
                disabled={signing}
                aria-label={selling ? 'Switch to buying' : 'Switch to selling'}
                title={selling ? 'Switch to buying' : 'Switch to selling'}
                className={cn(
                  'border-brown/40 text-muted-foreground absolute left-1/2 top-0 z-10 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 bg-[#2b2b2b]/80 shadow-lg backdrop-blur-md',
                  'hover:text-foreground transition-[background-color,color,transform] hover:bg-[#3a3a3a]/90 active:scale-95',
                  'disabled:cursor-not-allowed disabled:opacity-60'
                )}>
                <ArrowDownUp
                  className={cn(
                    'size-4 transition-transform duration-300',
                    selling && 'rotate-180'
                  )}
                />
              </button>

              <div className="rounded-16 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-14 text-foreground font-medium">You receive</span>
                  {/* Only for the first quote. A spinner that appears on every
                      keystroke is a flicker, and the dimmed number below already
                      says the figure is being replaced. */}
                  {quotePending && !repricing && <Spinner className="text-primary size-4" />}
                </div>
                <div
                  className={cn(
                    'mt-3 flex items-baseline justify-between gap-3 transition-opacity',
                    repricing && 'opacity-40'
                  )}>
                  <span className="text-32 text-foreground min-w-0 truncate font-medium tracking-[-0.04em]">
                    {quoteData ? formatTokenAmount(quoteData.receive_amount) : '\u2014'}
                  </span>
                  {/* The mirror of the token chip opposite. The two halves of a
                      swap were drawn differently — a logo and a name on the pay
                      side, bare grey text on the receive side — so the thing
                      being bought was the only asset on screen without a face.
                      Not a button: there is one token to receive, and the
                      previous screen chose it. */}
                  {selling ? (
                    <span className="self-center">
                      <TokenSelect
                        value={payToken}
                        chain={chain}
                        venue={venue}
                        issuer={selection.venue}
                        disabled={signing || repricing}
                        onChange={updatePayToken}
                      />
                    </span>
                  ) : (
                    <StockChip chain={chain} symbol={receiveSymbol} token={resolved.data} />
                  )}
                </div>
                <div
                  className={cn(
                    'text-12 text-muted-foreground mt-2 transition-opacity',
                    repricing && 'opacity-40'
                  )}>
                  {quoteData ? quoteValueLabel(quoteData) : '\u2014'}
                </div>
              </div>
            </div>
          </div>

          {quoteData && !hash && (
            <div className={cn('transition-opacity', repricing && 'opacity-40')}>
              <QuoteDetails
                quote={quoteData}
                seconds={secondsLeft}
                repricing={repricing || expired}
                showFreshness={!signing}
              />
            </div>
          )}

          {/* Same split as the detail page: only a 404 says the catalog looked
              and this token is not there. A backend that is not running has
              established nothing about what is buyable. */}
          {resolved.isError && isNotFound(resolved.error) && (
            <p className="text-11 rounded-10 bg-destructive/10 text-destructive p-3 leading-relaxed">
              {displayTicker} has no tokenized version on {VENUES[selection.venue].label} ·{' '}
              {CHAINS[chain].label}, so there is nothing here to buy.
            </p>
          )}

          {resolved.isError && !isNotFound(resolved.error) && (
            <p className="text-11 rounded-10 bg-destructive/10 text-destructive p-3 leading-relaxed">
              {describeRequestFailure(resolved.error).title}:{' '}
              {describeRequestFailure(resolved.error).detail}
            </p>
          )}

          {tradeUnavailable && (
            <p className="text-11 rounded-10 bg-warning/10 text-warning p-3 leading-relaxed">
              Ondo BNB Chain quotes use RFQ, but this app has no BNB RFQ execution adapter yet.
              Trading is disabled until that route is integrated.
            </p>
          )}

          {!portfolioTrackable && !tradeUnavailable && (
            <p className="text-11 rounded-10 text-muted-foreground bg-white/[0.04] p-3 leading-relaxed">
              This native settlement is supported for trading, but portfolio tracking currently
              covers USDT/USDC swaps only.
            </p>
          )}

          {quoteProblem && <QuoteErrorNotice error={quoteProblem} onRetry={priceIt} />}

          {error && (
            <p className="text-11 rounded-10 bg-destructive/10 text-destructive p-3 leading-relaxed">
              {error}
              {hash && settlement === 'reverted' && (
                <>
                  {' '}
                  <a
                    href={`https://bscscan.com/tx/${hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
                    View on BscScan
                    <ExternalLink className="size-3" />
                  </a>
                </>
              )}
            </p>
          )}

          {quoteData?.unsignable_reason && !quoteData.transaction && !error && (
            <p className="text-11 rounded-10 bg-warning/10 text-warning p-3 leading-relaxed">
              {quoteData.unsignable_reason}
            </p>
          )}

          {!walletAddress && (
            <p className="text-10 text-muted-foreground/70 rounded-10 bg-white/[0.04] p-2.5 leading-relaxed">
              {isSolana
                ? 'Signing with MetaMask’s Solana account. It signs; Jupiter broadcasts.'
                : 'Signing with MetaMask on BNB Chain. It sends the transaction itself.'}
            </p>
          )}

          <Button
            variant="primary"
            size="lg"
            className="rounded-16 h-14 w-full font-semibold"
            disabled={primaryDisabled}
            onClick={primaryAction}>
            {primaryLabel}
          </Button>

          {wallet?.installed === false && (
            <p className="text-10 text-muted-foreground text-center leading-relaxed">
              Install MetaMask to sign the purchase. You can still inspect the token without a
              wallet.
            </p>
          )}

          {resolved.isPending && (
            <div className="flex items-center justify-center py-2">
              <Spinner className="text-primary" />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Covers the buy screen rather than replacing it: the numbers behind it
          are the numbers it is describing. */}
      {filled && (
        <SuccessModal
          token={resolved.data ?? undefined}
          side={side}
          symbol={receiveSymbol}
          received={formatTokenAmount(filled.received)}
          paid={formatTokenAmount(filled.paid)}
          payToken={payToken}
          route={route}
          chain={chain}
          explorerUrl={
            isSolana
              ? `https://solscan.io/tx/${filled.hash}`
              : `https://bscscan.com/tx/${filled.hash}`
          }
          explorerName={isSolana ? 'Solscan' : 'BscScan'}
          hash={filled.hash}
          extra={
            isSolana || selling ? undefined : (
              <div className="rounded-10 bg-white/[0.04] p-3">
                {tokenImportState === 'pending' && (
                  <p className="text-12 text-muted-foreground">Confirm token import in MetaMask…</p>
                )}
                {tokenImportState === 'added' && (
                  <p className="text-12 text-primary">Token added to MetaMask.</p>
                )}
                {(tokenImportState === 'declined' || tokenImportState === 'failed') && (
                  <>
                    <p className="text-12 text-muted-foreground">
                      {tokenImportError ?? 'Token received, but it is not listed in MetaMask yet.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => void requestTokenImport()}
                      className="text-11 text-primary mt-2 font-medium underline underline-offset-2 hover:opacity-80">
                      Add {receiveSymbol} to MetaMask
                    </button>
                  </>
                )}
              </div>
            )
          }
          onDone={() => navigate(-1)}
          onBuyMore={() => {
            setHash(null)
            discardQuote()
            refreshBalances()
          }}
        />
      )}
    </Shell>
  )
}

export default BuyPage
