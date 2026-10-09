import { Check, Copy, Wallet } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  avatarFor,
  connect,
  NAMESPACE_LABEL,
  NamespaceMark,
  NAMESPACES,
  probeWallets,
  selectNamespace,
  shortAddress,
  useWalletAccount,
} from '@/matches/x/modules/wallet'
import type { WalletNamespace } from '@/matches/x/modules/wallet'

import { useDismiss } from './use-dismiss'

/**
 * The account control in the header.
 *
 * Two states and one control, not two controls. Disconnected it is a button
 * that says so; connected it is the account, and the same click that used to
 * connect now opens the account. Nothing here disconnects: MetaMask has no such
 * call, and a button that pretends to revoke a permission it cannot revoke is
 * worse than no button.
 *
 * The namespace switch lives in here rather than next to the issuer switch
 * because it is a property of the wallet, not of the market being read. One
 * wallet, two doors — MetaMask serves BNB Chain over the background port and
 * Solana only through the MAIN-world bridge — and which door is open is a fact
 * about the account.
 */

const HOW_LONG_COPIED_READS = 1400

/**
 * The address as a disc, and nothing else in it.
 *
 * See `modules/wallet/avatar.ts` for why the colours are derived from the
 * address rather than rolled once and stored.
 */
const Identicon = ({ address, className }: { address: string; className?: string }) => {
  const avatar = avatarFor(address)
  return (
    <span
      aria-hidden
      className={`shrink-0 rounded-full ${className ?? 'size-[18px]'}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${avatar.from}, ${avatar.to})` }}
    />
  )
}

export const WalletButton = () => {
  const account = useWalletAccount()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  // One probe per document, guarded inside the module — a header that remounts
  // on every route change must not ask MetaMask again each time.
  useEffect(probeWallets, [])

  useDismiss(
    open,
    container,
    useCallback(() => setOpen(false), [])
  )

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), HOW_LONG_COPIED_READS)
    return () => clearTimeout(timer)
  }, [copied])

  const selected = account.accounts[account.namespace]
  const address = selected.status?.address ?? null
  const busy = selected.connecting || selected.probing

  const choose = (namespace: WalletNamespace) => {
    selectNamespace(namespace)
    const next = account.accounts[namespace]
    // Switching to a namespace nobody has approved yet should ask, rather than
    // silently showing an empty account and waiting to be clicked a second time.
    if (!next.status?.address && !next.connecting) void connect(namespace)
  }

  const copy = () => {
    if (!address) return
    void navigator.clipboard?.writeText(address).then(() => setCopied(true))
  }

  if (!address) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void connect(account.namespace)}
        title={selected.error ?? undefined}
        className="text-11 text-foreground flex items-center gap-1.5 rounded-full border border-white/10 py-1 pl-2 pr-2.5 transition-colors hover:bg-white/5 disabled:opacity-50">
        <Wallet className="size-3" />
        {selected.connecting ? 'Connecting…' : 'Connect'}
      </button>
    )
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Wallet ${address} on ${NAMESPACE_LABEL[account.namespace]}`}
        // The full address on hover, the short one on screen: 500px of header
        // cannot hold 42 characters, and the person checking which account is
        // connected is checking the whole thing.
        title={`${address}\n${NAMESPACE_LABEL[account.namespace]}`}
        onClick={() => setOpen((value) => !value)}
        className="text-11 text-foreground flex items-center gap-1.5 rounded-full border border-white/10 py-1 pl-1 pr-2 transition-colors hover:bg-white/5">
        <Identicon address={address} />
        <span className="tabular-nums">{shortAddress(address)}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="rounded-10 bg-brown absolute right-0 top-full z-50 mt-1 w-[232px] border border-white/10 py-1 shadow-2xl">
          <div className="flex items-center gap-2 px-2.5 py-2">
            <Identicon address={address} className="size-7" />
            <div className="min-w-0 flex-1">
              <div className="text-11 text-foreground truncate tabular-nums">
                {shortAddress(address)}
              </div>
              <div className="text-10 text-muted-foreground truncate">
                {NAMESPACE_LABEL[account.namespace]}
              </div>
            </div>
            <button
              type="button"
              onClick={copy}
              aria-label="Copy address"
              className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors hover:bg-white/10">
              {copied ? <Check className="text-primary size-3" /> : <Copy className="size-3" />}
            </button>
          </div>

          <div className="my-1 h-px bg-white/10" />

          <div className="text-10 text-muted-foreground/70 px-2.5 pb-1 uppercase tracking-wide">
            Network
          </div>
          {NAMESPACES.map((namespace) => {
            const state = account.accounts[namespace]
            const active = account.namespace === namespace
            return (
              <button
                key={namespace}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(namespace)}
                className={`text-11 flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-white/5 ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                <NamespaceMark namespace={namespace} />
                <span className="flex-1 truncate">{NAMESPACE_LABEL[namespace]}</span>
                <span className="text-10 text-muted-foreground/70 truncate tabular-nums">
                  {state.connecting
                    ? 'connecting…'
                    : state.probing
                      ? '…'
                      : state.status?.address
                        ? shortAddress(state.status.address)
                        : state.status?.installed === false
                          ? 'no wallet'
                          : 'connect'}
                </span>
                {active && <Check className="text-primary size-3 shrink-0" />}
              </button>
            )
          })}

          {selected.error && (
            <p className="text-10 text-destructive px-2.5 pb-1.5 pt-1 leading-relaxed">
              {selected.error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
