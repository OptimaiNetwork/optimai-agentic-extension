import { CatalystApiError } from '@x/libs/catalyst'
import { readQuoteError } from './quote-error'
import { describe, expect, it } from 'vitest'

// The real class, not a look-alike declared here. `readQuoteError` now branches
// on `instanceof` for the unreachable case, and a local stand-in passes every
// structural check while failing that one — the drift would have hidden exactly
// the branch these tests exist to pin down.

const rejection = (status: number, body: unknown) => ({ response: { status, data: body } })

describe('what the buy panel tells somebody when a quote fails', () => {
  it('reads nothing out of nothing', () => {
    expect(readQuoteError(null)).toBeNull()
    expect(readQuoteError(undefined)).toBeNull()
  })

  it('does not blame the token when Binance has blocked the wallet', () => {
    // Measured against the live API with a wallet its KYT provider had flagged:
    // /quote answered 0 and /swap answered 40434. The route exists; the address
    // is the problem.
    const error = readQuoteError(
      rejection(403, {
        code: 'KYT_BLOCKED',
        detail:
          "This wallet is blocked by Binance's compliance screening, so the order cannot be built. " +
          'Nothing is wrong with the token or the route — try a different wallet.',
      })
    )

    expect(error?.tone).toBe('blocked')
    expect(error?.retryable).toBe(false)
    expect(error?.hint).toMatch(/different wallet/i)
    expect(error?.message).toMatch(/compliance/i)
  })

  it('offers the alternate venue when the server recommends it', () => {
    const error = readQuoteError(
      rejection(403, {
        code: 'KYT_BLOCKED',
        detail: 'Binance rejected this wallet.',
        suggested_venue: 'pancakeswap',
      })
    )

    expect(error?.suggestedVenue).toBe('pancakeswap')
  })

  it('reads the actual extension error shape, not only an Axios response', () => {
    const error = readQuoteError(
      new CatalystApiError(
        'This wallet is blocked by Binance compliance screening.',
        403,
        'KYT_BLOCKED'
      )
    )

    expect(error?.code).toBe('KYT_BLOCKED')
    expect(error?.message).toMatch(/compliance/i)
    expect(error?.tone).toBe('blocked')
    expect(error?.retryable).toBe(false)
  })

  it('treats a closed exchange as something to wait out, not something to retry', () => {
    const error = readQuoteError(
      rejection(409, { code: 'MARKET_CLOSED', detail: 'The underlying stock exchange is closed.' })
    )

    expect(error?.tone).toBe('waiting')
    expect(error?.retryable).toBe(false)
  })

  it('offers another go when the failure is transient', () => {
    for (const code of ['NO_LIQUIDITY', 'QUOTE_EXPIRED', 'VENDOR_FAILED', 'RATE_LIMITED']) {
      const error = readQuoteError(rejection(409, { code, detail: 'nope' }))
      expect(error?.retryable, code).toBe(true)
      expect(error?.tone, code).toBe('waiting')
    }
  })

  it('does not offer another go when the order itself is the problem', () => {
    for (const code of ['UNSUPPORTED_PAIR', 'ORDER_TOO_LARGE', 'PRICE_IMPACT_TOO_HIGH']) {
      const error = readQuoteError(rejection(422, { code, detail: 'nope' }))
      expect(error?.retryable, code).toBe(false)
      expect(error?.tone, code).toBe('failed')
    }
  })

  it('still says something when the server sends a code this build has never heard of', () => {
    const error = readQuoteError(
      rejection(502, { code: 'SOMETHING_NEW', detail: 'Binance said no' })
    )

    expect(error?.code).toBe('SOMETHING_NEW')
    expect(error?.message).toBe('Binance said no')
    expect(error?.tone).toBe('failed')
    expect(error?.retryable).toBe(true)
  })

  it('survives a failure that never reached the server at all', () => {
    // A network drop has no response body. The panel must not render
    // "undefined" at somebody.
    const error = readQuoteError(new Error('Network Error'))

    expect(error?.code).toBe('TRADE_FAILED')
    expect(error?.message).toBe('This purchase could not be priced.')
  })
})

describe('a backend that is not running', () => {
  it('reports the transport failure rather than a pricing verdict', () => {
    // The fallback would have said "This purchase could not be priced", which
    // is a claim about the order. Nothing answered, so nothing was priced and
    // nothing about the order is known.
    const error = readQuoteError(new CatalystApiError('Failed to fetch', 0))

    expect(error).toMatchObject({
      code: 'BACKEND_UNREACHABLE',
      message: 'Could not reach the backend',
      hint: 'Failed to fetch',
      retryable: true,
    })
  })

  it('still reads a served error as one', () => {
    // Status 0 is the only unreachable case; a real reply must keep its code.
    const error = readQuoteError(new CatalystApiError('Market closed', 409, 'MARKET_CLOSED'))

    expect(error?.code).toBe('MARKET_CLOSED')
    expect(error?.message).toBe('Market closed')
  })
})
