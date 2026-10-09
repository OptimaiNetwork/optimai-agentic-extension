import { describe, expect, it } from 'vitest'

import { walletErrorMessage } from './client'

describe('wallet errors displayed by the panel', () => {
  it('prefers a nested provider message over a generic RPC wrapper', () => {
    expect(
      walletErrorMessage(
        {
          code: -32603,
          message: 'Internal JSON-RPC error.',
          data: { message: 'insufficient funds for gas' },
        },
        'fallback'
      )
    ).toBe('insufficient funds for gas')
  })

  it('maps a wallet rejection to a readable message', () => {
    expect(walletErrorMessage({ code: 4001 }, 'fallback')).toBe('You closed the wallet prompt')
  })

  it('never renders a plain object as an error message', () => {
    expect(walletErrorMessage({ code: -32000, reason: 'execution failed' }, 'fallback')).toBe(
      'execution failed'
    )
    expect(walletErrorMessage({ code: -32000 }, 'fallback')).not.toBe('[object Object]')
  })
})
