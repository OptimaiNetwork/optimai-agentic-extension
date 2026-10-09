import { getPortfolioRecordingStatus } from '@x/modules/portfolio'
import type { PortfolioRecordingStatus } from '@x/modules/portfolio'
import type { PortfolioWallets } from '@x/services/catalyst'
import { useEffect, useState } from 'react'

const IDLE: PortfolioRecordingStatus = { pending: 0, failed: 0, unsaved: false, items: [] }

/** The local queue for these wallets, kept current across drains and X tabs. */
export const useRecordingStatus = (wallets: PortfolioWallets): PortfolioRecordingStatus => {
  const [status, setStatus] = useState<PortfolioRecordingStatus>(IDLE)

  useEffect(() => {
    if (!wallets.bnb && !wallets.solana) {
      setStatus(IDLE)
      return
    }
    const update = () => setStatus(getPortfolioRecordingStatus(wallets))
    update()
    window.addEventListener('catalyst:portfolio-recording-updated', update)
    return () => {
      window.removeEventListener('catalyst:portfolio-recording-updated', update)
    }
  }, [wallets])

  return status
}
