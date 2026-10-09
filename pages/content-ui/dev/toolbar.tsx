/**
 * The harness's own controls. Not part of the product, never shipped.
 *
 * It drives the panel through the same seam the page uses — the `catalyst:open`
 * event — rather than reaching into the router, so nothing here is a privilege
 * the real page would not have. Everything else it touches is the shim's state:
 * the fake wallet, and the storage the panel persists to.
 *
 * Bottom left on purpose: the panel is pinned right at 500px and the whole point
 * is to leave that alone.
 */

import { useState } from 'react'

import { devWallet } from './chrome-shim'
import { OPEN_PANEL_EVENT, type OpenPanelDetail } from '@x/layouts/global-layout'

/** Real bStock tickers, so every one of these resolves against the server. */
const QUICK_TICKERS = ['NVDA', 'TSLA', 'MSTR', 'COIN', 'PLTR', 'META', 'AMD']

const openPanel = (detail?: OpenPanelDetail) =>
  document.dispatchEvent(new CustomEvent(OPEN_PANEL_EVENT, { detail }))

type WalletMode = 'connected' | 'wrong-chain' | 'missing' | 'rejects'

const WALLET_MODES: { id: WalletMode; label: string }[] = [
  { id: 'connected', label: 'on BSC' },
  { id: 'wrong-chain', label: 'wrong chain' },
  { id: 'missing', label: 'not installed' },
  { id: 'rejects', label: 'rejects' },
]

const applyWalletMode = (mode: WalletMode) => {
  devWallet.installed = mode !== 'missing'
  devWallet.chainId = mode === 'wrong-chain' ? '0x1' : '0x38'
  devWallet.reject =
    mode === 'rejects' ? { message: 'MetaMask Tx Signature: User denied', code: 4001 } : null
}

export const Toolbar = ({
  backdrop,
  onBackdrop,
}: {
  backdrop: boolean
  onBackdrop: (next: boolean) => void
}) => {
  const [ticker, setTicker] = useState('NVDA')
  const [wallet, setWallet] = useState<WalletMode>('connected')

  const pick = (mode: WalletMode) => {
    applyWalletMode(mode)
    setWallet(mode)
  }

  const wipe = () => {
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (const key of Object.keys(store)) {
        if (key.startsWith('catalyst-dev:')) store.removeItem(key)
      }
    }
    window.location.reload()
  }

  return (
    <div className="dev-bar">
      <span className="dev-title">panel harness</span>

      <div className="dev-group">
        <button type="button" className="dev-primary" onClick={() => openPanel()}>
          Open panel
        </button>
        <form
          className="dev-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (ticker.trim()) openPanel({ ticker: ticker.trim().toUpperCase() })
          }}>
          <input
            className="dev-input"
            value={ticker}
            onChange={(event) => setTicker(event.target.value)}
            aria-label="Ticker to open"
            spellCheck={false}
          />
          <button type="submit" className="dev-btn">
            Go
          </button>
        </form>
      </div>

      <div className="dev-group">
        {QUICK_TICKERS.map((symbol) => (
          <button
            key={symbol}
            type="button"
            className="dev-chip"
            onClick={() => openPanel({ ticker: symbol })}>
            {symbol}
          </button>
        ))}
      </div>

      <div className="dev-group">
        <span className="dev-label">wallet</span>
        {WALLET_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`dev-chip${wallet === mode.id ? 'is-on' : ''}`}
            onClick={() => pick(mode.id)}>
            {mode.label}
          </button>
        ))}
      </div>

      <div className="dev-group">
        <button
          type="button"
          className={`dev-chip${backdrop ? 'is-on' : ''}`}
          onClick={() => onBackdrop(!backdrop)}>
          backdrop
        </button>
        <button type="button" className="dev-chip" onClick={wipe}>
          reset state
        </button>
      </div>
    </div>
  )
}
