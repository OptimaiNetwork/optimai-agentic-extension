import { drainPortfolioTradeQueue } from '@x/modules/portfolio'
import { catalystKeys } from '@x/queries/catalyst/keys'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

const DRAIN_INTERVAL_MS = 8_000

/**
 * Send the fills the buy screen queued to the portfolio API.
 *
 * On X, `GlobalLayout` does this. The queue lives in the extension's own
 * storage, shared by every tab, and any tab may drain it (recording the same
 * transaction twice is harmless). Runs while the trade panel is open,
 * and once more when it closes, so a fill that confirmed late still goes out.
 */
export const usePortfolioDrain = (): void => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const invalidate = () =>
      void queryClient.invalidateQueries({ queryKey: [...catalystKeys.all, 'portfolio'] })
    window.addEventListener('catalyst:portfolio-recorded', invalidate)
    window.addEventListener('catalyst:portfolio-recording-updated', invalidate)

    void drainPortfolioTradeQueue()
    const timer = window.setInterval(() => void drainPortfolioTradeQueue(), DRAIN_INTERVAL_MS)
    return () => {
      window.removeEventListener('catalyst:portfolio-recorded', invalidate)
      window.removeEventListener('catalyst:portfolio-recording-updated', invalidate)
      window.clearInterval(timer)
      void drainPortfolioTradeQueue()
    }
  }, [queryClient])
}
