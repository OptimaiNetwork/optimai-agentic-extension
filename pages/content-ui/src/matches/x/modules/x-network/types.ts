/** A cashtag as X resolved it — ticker and company name, already looked up. */
export interface CatalystSymbol {
  /** The text after the `$`, e.g. NVDA. */
  text: string
  /** X's own resolution. Absent when X did not recognise the cashtag. */
  ticker?: string
  name?: string
}

export interface CatalystAuthor {
  handle: string
  name: string
  followers?: number
  /** X's badge. A subscription marker, not proof of identity. */
  verified: boolean
  /** Profile picture as X served it. Absent when the response carried none. */
  avatarUrl?: string
}

export interface CatalystMetrics {
  replies?: number
  reposts?: number
  likes?: number
  quotes?: number
  views?: number
}

export interface CatalystPost {
  id: string
  url: string
  text: string
  createdAt?: string
  author: CatalystAuthor
  symbols: CatalystSymbol[]
  metrics: CatalystMetrics
  /** When the extension received the network batch, distinct from tweet time. */
  capturedAt?: number
  /** Present when this post quotes another; the quoted post is not inlined. */
  quotedPostId?: string
  repostedPostId?: string
}

/**
 * What the walk saw, whether or not it understood it.
 *
 * Counted so that a parser which has quietly stopped understanding half of X's
 * entries reads differently from one that found nothing because there was
 * nothing. The reference implementation this design is drawn from computes these
 * and then never reads them, which means partial drift is invisible there.
 */
export interface ParseCoverage {
  instructions: number
  unsupportedInstructions: number
  entries: number
  tweetEntries: number
  unsupportedTweetEntries: number
  cursorEntries: number
  tombstoneEntries: number
  otherEntries: number
}

export type ParseReason =
  | 'MALFORMED_BODY'
  | 'MISSING_TIMELINE'
  | 'UNSUPPORTED_TIMELINE'
  | 'PARTIAL_DRIFT'

export type ParseResult =
  /** The envelope was recognised. `posts` may legitimately be empty. */
  | { outcome: 'ok'; posts: CatalystPost[]; coverage: ParseCoverage }
  /**
   * X answered, and the shapes we expect were not there. Any posts recovered
   * before giving up are attached, but the caller must not treat this as a
   * complete reading.
   */
  | { outcome: 'drift'; reason: ParseReason; posts: CatalystPost[]; coverage: ParseCoverage }
