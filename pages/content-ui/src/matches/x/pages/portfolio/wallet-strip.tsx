import { connect, NAMESPACES, NamespaceMark, shortAddress } from '@x/modules/wallet'
import type { AccountState, WalletNamespace } from '@x/modules/wallet'
import { Check, Copy, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { CHAIN_NAME } from './format'

const NAMESPACE_CHAIN = { evm: 'bnb', svm: 'solana' } as const
const HOW_LONG_COPIED_READS = 1400

const connectLabel = (account: AccountState, chainName: string): string => {
  if (account.probing) return 'Checking…'
  if (account.connecting) return 'Connecting…'
  return `Connect ${chainName}`
}

const CopyAddress = ({ address, chainName }: { address: string; chainName: string }) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), HOW_LONG_COPIED_READS)
    return () => clearTimeout(timer)
  }, [copied])

  const Icon = copied ? Check : Copy
  return (
    <button
      type="button"
      aria-label={copied ? `${chainName} address copied` : `Copy ${chainName} address`}
      onClick={() => void navigator.clipboard?.writeText(address).then(() => setCopied(true))}
      className={`-m-1.5 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/5 ${copied ? 'text-positive' : 'text-faint hover:text-foreground'}`}>
      <Icon className="size-3" aria-hidden="true" />
    </button>
  )
}

/** One wallet, as a card when it is in the portfolio or a button to add it. */
const WalletCard = ({
  namespace,
  account,
}: {
  namespace: WalletNamespace
  account: AccountState
}) => {
  const address = account.status?.address
  const chainName = CHAIN_NAME[NAMESPACE_CHAIN[namespace]]
  if (address) {
    return (
      <div
        title={address}
        className="bg-surface border-border-soft flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2">
        <NamespaceMark namespace={namespace} className="size-6" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-12 text-foreground truncate font-semibold">{chainName}</span>
          <span className="text-11 text-faint flex items-center gap-2 tabular-nums">
            <span className="truncate">{shortAddress(address)}</span>
            <CopyAddress address={address} chainName={chainName} />
          </span>
        </span>
        <span
          role="img"
          aria-label="Connected"
          className="bg-positive size-[7px] shrink-0 rounded-full"
        />
      </div>
    )
  }
  return (
    <button
      type="button"
      disabled={account.connecting || account.probing}
      onClick={() => void connect(namespace)}
      className="text-12 text-foreground flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl border border-dashed border-white/20 px-3 py-2 font-semibold transition-colors hover:bg-white/5 disabled:opacity-50">
      <NamespaceMark namespace={namespace} className="size-6" />
      <span className="truncate">{connectLabel(account, chainName)}</span>
      <Plus className="ml-auto size-3.5 shrink-0" aria-hidden="true" />
    </button>
  )
}

/** Which wallets the numbers below add up; the missing one is one tap away. */
export const WalletStrip = ({ accounts }: { accounts: Record<WalletNamespace, AccountState> }) => (
  <div aria-label="Wallets in this portfolio" className="grid grid-cols-2 gap-2.5">
    {NAMESPACES.map((namespace) => (
      <WalletCard key={namespace} namespace={namespace} account={accounts[namespace]} />
    ))}
  </div>
)
