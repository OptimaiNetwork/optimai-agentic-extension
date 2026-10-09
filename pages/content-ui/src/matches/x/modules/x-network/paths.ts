/**
 * Where X keeps things, and everywhere it has kept them before.
 *
 * These chains are not defensive programming for its own sake. X restructured
 * its user object away from a flat `legacy` blob into `core`, `avatar`,
 * `verification`, `relationship_counts` and friends, and both shapes are still
 * served depending on the surface and the era. A reader that knows only one of
 * them returns `undefined` for a follower count on half the responses — quietly,
 * with no error, feeding a null into whatever scores the post.
 *
 * Confirmed against a live capture on 2026-09-19: `SearchTimeline` returned
 * `core.screen_name` and `relationship_counts.followers`, and nothing under
 * `legacy` for either.
 */

type Json = Record<string, unknown>

export type Path = readonly string[]

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const valueAt = (source: unknown, path: Path): unknown => {
  let current = source
  for (const key of path) {
    if (!isRecord(current)) return undefined
    current = current[key]
  }
  return current
}

export const firstOf = (source: unknown, paths: readonly Path[]): unknown => {
  for (const path of paths) {
    const value = valueAt(source, path)
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

export const stringAt = (source: unknown, paths: readonly Path[]): string | undefined => {
  const value = firstOf(source, paths)
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** X sends `views.count` as a string. A number-only reader loses view counts. */
export const numberAt = (source: unknown, paths: readonly Path[]): number | undefined => {
  const value = firstOf(source, paths)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) return Number(value)
  return undefined
}

export const boolAt = (source: unknown, paths: readonly Path[]): boolean =>
  firstOf(source, paths) === true

export const recordAt = (source: unknown, paths: readonly Path[]): Json | undefined => {
  const value = firstOf(source, paths)
  return isRecord(value) ? value : undefined
}

export const arrayAt = (source: unknown, paths: readonly Path[]): unknown[] => {
  const value = firstOf(source, paths)
  return Array.isArray(value) ? value : []
}

// --- Timeline roots -------------------------------------------------------

export const SEARCH_TIMELINE: readonly Path[] = [
  ['data', 'search_by_raw_query', 'search_timeline', 'timeline'],
  ['data', 'search_by_raw_query', 'search_timeline'],
  ['data', 'searchTimeline', 'timeline'],
]

export const HOME_TIMELINE: readonly Path[] = [
  ['data', 'home', 'home_timeline_urt'],
  ['data', 'home_timeline_urt'],
]

export const USER_TIMELINE: readonly Path[] = [
  ['data', 'user', 'result', 'timeline', 'timeline'],
  ['data', 'user', 'result', 'timeline_v2', 'timeline'],
  ['data', 'user', 'result', 'timeline_v2'],
  ['data', 'user', 'result', 'timeline'],
]

export const TWEET_DETAIL: readonly Path[] = [
  ['data', 'threaded_conversation_with_injections_v2'],
  ['data', 'tweet_result', 'result', 'threaded_conversation_with_injections_v2'],
]

export const TIMELINE_ROOTS: readonly Path[] = [
  ...SEARCH_TIMELINE,
  ...HOME_TIMELINE,
  ...USER_TIMELINE,
  ...TWEET_DETAIL,
]

// --- Inside a tweet -------------------------------------------------------

export const TWEET_ID: readonly Path[] = [['rest_id'], ['legacy', 'id_str'], ['id_str']]

/**
 * `note_tweet` first, deliberately. A long post carries its full body there and
 * a truncated copy in `legacy.full_text`; reading the obvious field gives you
 * 280 characters of a 4000-character post with no indication anything is
 * missing.
 */
export const TWEET_TEXT: readonly Path[] = [
  ['note_tweet', 'note_tweet_results', 'result', 'text'],
  ['legacy', 'full_text'],
  ['text'],
]

export const TWEET_CREATED_AT: readonly Path[] = [['legacy', 'created_at'], ['created_at']]
export const TWEET_SYMBOLS: readonly Path[] = [
  ['legacy', 'entities', 'symbols'],
  ['entities', 'symbols'],
]

export const QUOTED_ID: readonly Path[] = [
  ['quoted_status_result', 'result', 'rest_id'],
  ['quoted_status_result', 'result', 'tweet', 'rest_id'],
  ['legacy', 'quoted_status_id_str'],
]

export const REPOSTED_ID: readonly Path[] = [
  ['legacy', 'retweeted_status_result', 'result', 'rest_id'],
  ['retweeted_status_result', 'result', 'rest_id'],
  ['legacy', 'retweeted_status_id_str'],
]

export const METRICS: Record<string, readonly Path[]> = {
  replies: [['legacy', 'reply_count'], ['reply_count']],
  reposts: [['legacy', 'retweet_count'], ['retweet_count']],
  likes: [['legacy', 'favorite_count'], ['favorite_count']],
  quotes: [['legacy', 'quote_count'], ['quote_count']],
  views: [
    ['views', 'count'],
    ['ext_views', 'count'],
  ],
}

// --- Inside an author -----------------------------------------------------

export const AUTHOR_ROOT: readonly Path[] = [
  ['core', 'user_results', 'result'],
  ['author_results', 'result'],
  ['user_results', 'result'],
]

export const AUTHOR_HANDLE: readonly Path[] = [
  ['core', 'screen_name'],
  ['legacy', 'screen_name'],
  ['screen_name'],
]

export const AUTHOR_NAME: readonly Path[] = [['core', 'name'], ['legacy', 'name'], ['name']]

/**
 * Follower count is NOT in `legacy` on current responses. Reading
 * `legacy.followers_count` returns undefined — a null handed to whatever weighs
 * the source, rather than an error anybody would notice.
 */
export const AUTHOR_FOLLOWERS: readonly Path[] = [
  ['relationship_counts', 'followers'],
  ['legacy', 'followers_count'],
]

/**
 * The profile picture, which moved out of `legacy` in the same restructure that
 * moved the handle. `avatar.image_url` is what current `SearchTimeline`
 * responses carry; the two `profile_image_url_https` chains are the older
 * shapes, still served on some surfaces.
 *
 * X serves a `_normal` variant at 48px, which is smaller than the avatar a card
 * draws. The URL is stored exactly as read — resizing it by string surgery
 * would be this code guessing at a CDN's naming convention, and a guessed URL
 * that 404s renders as a missing image rather than as the fallback silhouette.
 */
export const AUTHOR_AVATAR: readonly Path[] = [
  ['avatar', 'image_url'],
  ['legacy', 'profile_image_url_https'],
  ['profile_image_url_https'],
]

export const AUTHOR_VERIFIED: readonly Path[] = [
  ['is_blue_verified'],
  ['verification', 'verified'],
  ['legacy', 'verified'],
]
