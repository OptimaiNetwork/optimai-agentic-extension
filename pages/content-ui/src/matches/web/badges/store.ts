import { useSyncExternalStore } from 'react'

import type { MentionListing } from '../lexicon/listing'

/** A badge the scanner put on the page, and what its pill shows. */
export interface PageBadge {
  /** Unique for the life of the page, where a key comes back once its badge is gone. */
  id: number
  /** `company:NVDA`, `symbol:NVDAON`: unique on the page while the badge is on it. */
  key: string
  /** The `catalyst-badge` element in the page. */
  host: HTMLElement
  /** Its shadow root, where the pill renders. */
  mount: ShadowRoot
  ticker: string
  listing: MentionListing
}

let badges: readonly PageBadge[] = []
const listeners = new Set<() => void>()

const emit = () => {
  for (const listener of listeners) listener()
}

const connected = (list: readonly PageBadge[]) => list.filter((badge) => badge.host.isConnected)

export const addBadges = (next: readonly PageBadge[]): void => {
  if (!next.length) return
  badges = [...connected(badges), ...next]
  emit()
}

/**
 * Forget badges whose mention the page removed, so their pills unmount. Cheap
 * enough to run on a timer: it only emits when something actually went.
 */
export const pruneBadges = (): void => {
  const kept = connected(badges)
  if (kept.length === badges.length) return
  badges = kept
  emit()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const usePageBadges = (): readonly PageBadge[] =>
  useSyncExternalStore(
    subscribe,
    () => badges,
    () => badges
  )
