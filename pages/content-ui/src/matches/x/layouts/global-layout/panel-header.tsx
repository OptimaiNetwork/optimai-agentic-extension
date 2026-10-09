import { Brand } from './brand'
import { ChainSwitcher, VenueSwitcher } from './chain-switcher'
import { MenuButton } from './menu-button'
import { WalletButton } from './wallet-button'

export const PanelHeader = () => (
  <header className="bg-brown/95 flex h-12 flex-shrink-0 items-center gap-2 border-b border-white/10 px-2.5">
    <MenuButton />
    <Brand />
    <div className="ml-auto flex items-center gap-1.5">
      <ChainSwitcher />
      <VenueSwitcher />
      <WalletButton />
    </div>
  </header>
)
