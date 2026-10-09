import {
  DEFAULT_CHAIN,
  DEFAULT_VENUE,
  DEFAULT_VENUE_BY_CHAIN,
  VENUE_LISTINGS,
  VENUES,
  VENUE_IDS,
  isChainId,
  isVenueAvailableOnChain,
  isVenueId,
  venueDescriptor,
} from '@extension/shared'
import type { ChainId, VenueId } from '@extension/shared'
import { useSyncExternalStore } from 'react'

export type { ChainId, VenueId }
export { VENUES, VENUE_IDS, VENUE_LISTINGS, venueDescriptor }

export interface VenueSelection {
  venue: VenueId
  chain: ChainId
}

interface PersistedVenueSelection extends VenueSelection {
  version: 2
}

const VENUE_STORAGE_KEY = 'catalyst-selection-v2'
const LEGACY_VENUE_STORAGE_KEY = 'catalyst-venue'
const LEGACY_CHAIN_STORAGE_KEY = 'catalyst-chain'

const DEFAULT_SELECTION: VenueSelection = { venue: DEFAULT_VENUE, chain: DEFAULT_CHAIN }

let current: VenueSelection = DEFAULT_SELECTION
const listeners = new Set<() => void>()

export const getSelection = (): VenueSelection => current
export const getVenue = (): VenueId => current.venue
export const getSelectedChain = (): ChainId => current.chain

export const subscribeSelection = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const emit = () => listeners.forEach((listener) => listener())

const isValidSelection = (value: unknown): value is VenueSelection => {
  if (!value || typeof value !== 'object') return false
  const selection = value as Partial<VenueSelection>
  return (
    isVenueId(selection.venue) &&
    isChainId(selection.chain) &&
    isVenueAvailableOnChain(selection.venue, selection.chain)
  )
}

const persist = (selection: VenueSelection): void => {
  const value: PersistedVenueSelection = { ...selection, version: 2 }
  void chrome.storage?.local?.set({ [VENUE_STORAGE_KEY]: value }).catch(() => undefined)
}

/**
 * Pass an explicit pair when it is known. A venue-only legacy caller keeps the
 * current chain when that issuer is available there, then uses its default.
 */
export function setSelection(venue: VenueId, chain?: ChainId): void
export function setSelection(selection: VenueSelection): void
export function setSelection(venueOrSelection: VenueId | VenueSelection, chain?: ChainId): void {
  let next: VenueSelection

  if (typeof venueOrSelection === 'string') {
    if (!isVenueId(venueOrSelection)) return
    const selectedChain =
      chain ??
      (isVenueAvailableOnChain(venueOrSelection, current.chain)
        ? current.chain
        : VENUES[venueOrSelection].chain)
    next = { venue: venueOrSelection, chain: selectedChain }
  } else {
    next = venueOrSelection
  }

  // Ignore stale links or callers that name an impossible pair. A later valid
  // user choice can still change both fields together.
  if (!isValidSelection(next)) return
  if (next.venue === current.venue && next.chain === current.chain) return

  current = { venue: next.venue, chain: next.chain }
  emit()
  persist(current)
}

export const setVenue = (venue: VenueId): void => setSelection(venue)

/** Keep the active issuer when possible; otherwise choose the chain default. */
export const setChain = (chain: ChainId): void => {
  if (!isChainId(chain)) return
  if (chain === current.chain) return
  const venue = isVenueAvailableOnChain(current.venue, chain)
    ? current.venue
    : DEFAULT_VENUE_BY_CHAIN[chain]
  setSelection(venue, chain)
}

const restoreLegacySelection = (storedVenue: unknown, storedChain: unknown): VenueSelection => {
  if (isVenueId(storedVenue)) {
    if (isChainId(storedChain) && isVenueAvailableOnChain(storedVenue, storedChain)) {
      return { venue: storedVenue, chain: storedChain }
    }
    return { venue: storedVenue, chain: VENUES[storedVenue].chain }
  }

  // Before venue persistence, Solana was the old chain-only tab for PreStocks.
  if (isChainId(storedChain))
    return { venue: DEFAULT_VENUE_BY_CHAIN[storedChain], chain: storedChain }
  return DEFAULT_SELECTION
}

/** Read v2 selection first, then migrate the former separate storage keys. */
export const loadSelection = async (): Promise<VenueSelection> => {
  try {
    const stored = await chrome.storage?.local?.get([
      VENUE_STORAGE_KEY,
      LEGACY_VENUE_STORAGE_KEY,
      LEGACY_CHAIN_STORAGE_KEY,
    ])
    const saved = stored?.[VENUE_STORAGE_KEY]

    if (
      saved &&
      typeof saved === 'object' &&
      (saved as Partial<PersistedVenueSelection>).version === 2 &&
      isValidSelection(saved)
    ) {
      current = { venue: saved.venue, chain: saved.chain }
    } else {
      current = restoreLegacySelection(
        stored?.[LEGACY_VENUE_STORAGE_KEY],
        stored?.[LEGACY_CHAIN_STORAGE_KEY]
      )
      persist(current)
    }
    emit()
  } catch {
    // Storage failure leaves the deterministic Solana + Ondo default in place.
  }
  return current
}

export const useSelection = (): VenueSelection =>
  useSyncExternalStore(subscribeSelection, getSelection, getSelection)
export const useVenue = (): VenueId => useSelection().venue
export const useSelectedChain = (): ChainId => useSelection().chain
