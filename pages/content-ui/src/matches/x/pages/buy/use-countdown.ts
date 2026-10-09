import { useEffect, useState } from 'react'

/**
 * Seconds left on a quote.
 *
 * Binance mints quote ids with about thirty seconds of life and sends no TTL
 * field of any kind — PancakeSwap's aggregator sends none either. Without a
 * countdown the first anybody learns of expiry is a rejected signature, after
 * they have already opened their wallet and read the numbers.
 */
export const useCountdown = (expiresAt: string | undefined): number => {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    if (!expiresAt) {
      setLeft(0)
      return
    }

    const deadline = new Date(expiresAt).getTime()
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))

    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [expiresAt])

  return left
}
