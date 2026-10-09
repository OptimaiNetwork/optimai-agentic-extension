import type { VenueId } from '@extension/shared'
import type { TradeVenue } from '@x/services/catalyst'

export type PaymentToken = 'USDT' | 'USDC' | 'BNB' | 'SOL'

/**
 * The full name is what the menu is for.
 *
 * The list used to carry a `color` per token, which existed only to tint a
 * letter in a disc; the marks are real artwork now and bring their own colours.
 * What it did not carry was the name, so the menu offered four ticker symbols
 * and nothing to tell a first-time buyer that USDC is a dollar.
 */
export const PAYMENT_TOKENS: Array<{ symbol: PaymentToken; name: string }> = [
  { symbol: 'USDT', name: 'Tether USD' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'SOL', name: 'Solana' },
]

/**
 * What this issuer and chain will actually accept, probed rather than assumed.
 *
 * Every line below is one live quote against the running server. The menu used
 * to be guessed from the route, which offered SOL for Ondo — two clicks and an
 * error message — and left a whole branch describing a route that no longer
 * exists.
 *
 *   bStocks  · PancakeSwap · 50 USDT -> 200, 0.22188238 NVDAB
 *   bStocks  · PancakeSwap · 50 USDC -> 200, 0.22191138 NVDAB
 *   bStocks  · PancakeSwap · 50 BNB  -> 200, 178.606637 NVDAB
 *   bStocks  · binance     · any     -> 503, "bStocks trade through PancakeSwap.
 *                                             The legacy BNB Chain RFQ route is
 *                                             disabled."
 *   PreStocks · Jupiter    · 1 SOL   -> 200, 0.192304346 SPACEX
 *   Ondo      · Jupiter    · 1 SOL   -> 503, "Only USDC is available for
 *                                             swapping with Ondo tokens"
 *
 * So the issuer decides on Solana, and BNB Chain has exactly one route: the
 * `venue` argument no longer selects anything, and is kept only because callers
 * pass it and a future second BNB route would need it back.
 *
 * Offering a choice that cannot work is worse than offering no choice — the
 * picker collapses to a plain label when one token is left, which is the honest
 * shape for Ondo.
 */
const only = (...symbols: PaymentToken[]) =>
  PAYMENT_TOKENS.filter((token) => symbols.includes(token.symbol))

export const availableTokens = (
  chain: 'bnb' | 'solana',
  _venue: TradeVenue,
  issuer?: VenueId
): Array<{ symbol: PaymentToken; name: string }> => {
  if (chain === 'solana') {
    return issuer === 'ondo' ? only('USDC') : only('USDC', 'SOL')
  }
  return only('USDT', 'USDC', 'BNB')
}
