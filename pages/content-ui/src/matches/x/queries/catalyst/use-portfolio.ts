import { catalystService } from '@x/services/catalyst'
import type { PortfolioHistoryWindow, PortfolioWallets } from '@x/services/catalyst'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { catalystKeys } from './keys'

export const PORTFOLIO_PAGE_SIZE = 20

const hasWallet = (wallets: PortfolioWallets): boolean => Boolean(wallets.bnb || wallets.solana)

export const usePortfolioStats = (wallets: PortfolioWallets) =>
  useQuery({
    queryKey: catalystKeys.portfolioStats(wallets),
    queryFn: async () => (await catalystService.portfolioStats(wallets)).data,
    enabled: hasWallet(wallets),
    staleTime: 15_000,
  })

export const usePortfolioTrades = (wallets: PortfolioWallets, page: number) =>
  useQuery({
    queryKey: catalystKeys.portfolioTrades(wallets, page, PORTFOLIO_PAGE_SIZE),
    queryFn: async () =>
      (await catalystService.portfolioTrades(wallets, page, PORTFOLIO_PAGE_SIZE)).data,
    enabled: hasWallet(wallets),
    staleTime: 15_000,
  })

/**
 * The P&L line. Switching window keeps the previous line on screen until the
 * new one lands, so the chart dims instead of collapsing to a skeleton.
 */
export const usePortfolioHistory = (wallets: PortfolioWallets, window: PortfolioHistoryWindow) =>
  useQuery({
    queryKey: catalystKeys.portfolioHistory(wallets, window),
    queryFn: async () => (await catalystService.portfolioHistory(wallets, window)).data,
    enabled: hasWallet(wallets),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
