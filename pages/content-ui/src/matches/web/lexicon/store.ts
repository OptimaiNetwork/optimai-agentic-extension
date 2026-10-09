import { pageService } from '../services'
import { parseLexicon } from './parse'
import type { Lexicon } from '../services/types'

const STORAGE_KEY = 'catalyst-lexicon-v1'
/** Past this a stored copy is fetched again before the page is scanned. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000
/** Past this a stored copy is used at once and checked against the server behind it. */
const CHECK_AFTER_MS = 15 * 60 * 1000

interface Stored {
  savedAt: number
  checkedAt: number
  lexicon: unknown
}

const read = async (): Promise<{ lexicon: Lexicon; savedAt: number; checkedAt: number } | null> => {
  try {
    const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] as Stored | undefined
    if (!stored || typeof stored.savedAt !== 'number') return null
    const lexicon = parseLexicon(stored.lexicon)
    if (!lexicon) return null
    return {
      lexicon,
      savedAt: stored.savedAt,
      checkedAt: typeof stored.checkedAt === 'number' ? stored.checkedAt : stored.savedAt,
    }
  } catch {
    // Storage can be unavailable (a context torn down mid-read); the network
    // is the fallback, not an error.
    return null
  }
}

const write = async (lexicon: Lexicon, savedAt: number, checkedAt: number): Promise<void> => {
  try {
    const value: Stored = { savedAt, checkedAt, lexicon }
    await chrome.storage.local.set({ [STORAGE_KEY]: value })
  } catch {
    // A full or unavailable store costs the next page one download.
  }
}

const download = async (): Promise<Lexicon | null> => {
  const lexicon = parseLexicon((await pageService.lexicon()).data)
  if (lexicon) await write(lexicon, Date.now(), Date.now())
  return lexicon
}

/** Replaces the stored copy when the server has moved on. Never throws. */
const revalidate = async (stored: Lexicon, savedAt: number): Promise<void> => {
  try {
    const { data } = await pageService.lexiconVersion()
    if (data?.version === stored.version) {
      await write(stored, savedAt, Date.now())
      return
    }
    await download()
  } catch {
    // Offline or the server is down: keep what we have, try on the next page.
  }
}

/**
 * The lexicon for this page, from storage when it can be and the network when
 * it must.
 *
 * A fresh copy is used as is. A copy older than fifteen minutes is used at once
 * and checked behind the page, so the next page gets any change. A copy older
 * than six hours is replaced before scanning; if the server cannot be reached
 * the old copy is still better than nothing and is used anyway.
 */
export const loadLexicon = async (now = Date.now()): Promise<Lexicon | null> => {
  const stored = await read()
  if (stored && now - stored.savedAt < MAX_AGE_MS) {
    if (now - stored.checkedAt >= CHECK_AFTER_MS) void revalidate(stored.lexicon, stored.savedAt)
    return stored.lexicon
  }
  try {
    return (await download()) ?? stored?.lexicon ?? null
  } catch {
    return stored?.lexicon ?? null
  }
}

export const LEXICON_STORAGE_KEY = STORAGE_KEY
