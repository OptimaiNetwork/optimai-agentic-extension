/**
 * What a failed quote means, and how the panel should say it.
 *
 * The server answers every trade failure with `{ detail, code }`. The sentence
 * is already written there — this file only decides the tone, whether trying
 * again could possibly help, and whether the person needs more than a sentence.
 *
 * The distinction that forced this: a wallet Binance's KYT screening has
 * flagged fails at `/swap` with `40434` while `/quote` for the same wallet and
 * the same pair succeeds. The panel used to print "No route to buy this token
 * with USDT on BNB Chain", which sent people hunting for a liquidity problem
 * that does not exist.
 */

import { describeRequestFailure, isUnreachable } from '@x/libs/request-error'

export type QuoteErrorTone =
  /** Binance will not build this order for this wallet. Retrying changes nothing. */
  | 'blocked'
  /** True right now, false later — closed market, thin book, expired quote. */
  | 'waiting'
  /** The order itself is wrong, or something broke. */
  | 'failed'

export type QuoteError = {
  code: string
  tone: QuoteErrorTone
  message: string
  hint?: string
  retryable: boolean
  suggestedVenue?: 'pancakeswap'
}

type Presentation = {
  tone: QuoteErrorTone
  hint?: string
  retryable: boolean
}

const FALLBACK_MESSAGE = 'This purchase could not be priced.'

const PRESENTATION: Record<string, Presentation> = {
  KYT_BLOCKED: {
    tone: 'blocked',
    hint: 'The token and the route are fine — Binance screens the wallet address itself. A different wallet prices normally.',
    retryable: false,
  },
  WALLET_SANCTIONED: {
    tone: 'blocked',
    hint: 'The issuer’s compliance contract lists this address as sanctioned, and the token refuses every transfer to or from it — a swap would only revert after the approval. A different wallet trades normally.',
    retryable: false,
  },
  KYT_CONFIRMATION_REQUIRED: {
    tone: 'blocked',
    hint: 'Binance wants this purchase acknowledged before it will build the order.',
    retryable: false,
  },
  REGION_BLOCKED: {
    tone: 'blocked',
    hint: 'Binance geoblocks its trading API in the US, Canada, the UK, the Netherlands and Japan.',
    retryable: false,
  },
  MARKET_CLOSED: {
    tone: 'waiting',
    // Named no issuer for a while: it said "bStocks track a real exchange",
    // which is true and was being printed under an Ondo order routed through
    // Jupiter. Every issuer on this panel tracks a real exchange; that is what
    // a tokenized stock is.
    hint: 'A tokenized stock tracks a real exchange, so it only prices while that exchange is open.',
    retryable: false,
  },
  NO_LIQUIDITY: { tone: 'waiting', retryable: true },
  NO_ROUTE: { tone: 'waiting', retryable: true },
  QUOTE_EXPIRED: { tone: 'waiting', retryable: true },
  QUOTE_MISMATCH: { tone: 'waiting', retryable: true },
  VENDOR_FAILED: { tone: 'waiting', retryable: true },
  UPSTREAM_UNAVAILABLE: { tone: 'waiting', retryable: true },
  APPROVAL_UNAVAILABLE: { tone: 'waiting', retryable: true },
  RATE_LIMITED: { tone: 'waiting', retryable: true },
  UNSUPPORTED_PAIR: { tone: 'failed', retryable: false },
  UNSUPPORTED_PAY_TOKEN: { tone: 'failed', retryable: false },
  ORDER_TOO_LARGE: { tone: 'failed', retryable: false },
  ORDER_TOO_SMALL: { tone: 'failed', retryable: false },
  INVALID_SLIPPAGE: { tone: 'failed', retryable: false },
  PRICE_IMPACT_TOO_HIGH: { tone: 'failed', retryable: false },
  CHAIN_UNSUPPORTED: { tone: 'failed', retryable: true },
  SERVICE_MISCONFIGURED: { tone: 'failed', retryable: true },
  VENUE_UNAVAILABLE: { tone: 'waiting', retryable: true },
  INVALID_TRADE_REQUEST: { tone: 'failed', retryable: false },
  PANCAKESWAP_FAILED: { tone: 'waiting', retryable: true },
  TRADE_FAILED: { tone: 'failed', retryable: true },
}

const DEFAULT_PRESENTATION: Presentation = { tone: 'failed', retryable: true }

const bodyOf = (
  caught: unknown
): {
  detail?: unknown
  code?: unknown
  suggested_venue?: unknown
} => {
  if (!caught || typeof caught !== 'object') return {}

  const error = caught as {
    code?: unknown
    message?: unknown
    suggestedVenue?: unknown
    response?: { data?: unknown }
  }
  const data = error.response?.data
  if (data && typeof data === 'object') {
    const body = data as { detail?: unknown; code?: unknown; suggested_venue?: unknown }
    if (typeof body.code === 'string' || typeof body.detail === 'string') return body
  }

  // The real panel client throws CatalystApiError, not AxiosError. Keep the
  // fallback above for callers/tests that already provide an HTTP-shaped error,
  // but read the actual `{ message, code }` contract first-class as well.
  if (typeof error.code === 'string') {
    return {
      code: error.code,
      detail: typeof error.message === 'string' ? error.message : undefined,
      suggested_venue: error.suggestedVenue,
    }
  }

  return {}
}

/**
 * Read one failed quote.
 *
 * Returns `null` for "nothing failed", so the caller can render on presence
 * rather than juggling a separate boolean.
 */
export const readQuoteError = (caught: unknown): QuoteError | null => {
  if (!caught) return null

  // Nothing answered, so there is no `{ detail, code }` to read and the
  // fallback below would print "This purchase could not be priced" over a
  // backend that is simply not running — the same substitution this file's
  // header was written about, one layer down.
  if (isUnreachable(caught)) {
    return {
      code: 'BACKEND_UNREACHABLE',
      message: describeRequestFailure(caught).title,
      hint: describeRequestFailure(caught).detail,
      tone: 'failed',
      retryable: true,
    }
  }

  const body = bodyOf(caught)
  const code = typeof body.code === 'string' ? body.code : 'TRADE_FAILED'
  const message = typeof body.detail === 'string' ? body.detail : FALLBACK_MESSAGE
  const presentation = PRESENTATION[code] ?? DEFAULT_PRESENTATION

  const suggestedVenue = body.suggested_venue === 'pancakeswap' ? 'pancakeswap' : undefined
  return { code, message, ...presentation, suggestedVenue }
}
