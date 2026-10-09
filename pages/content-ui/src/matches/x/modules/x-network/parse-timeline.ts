import {
  AUTHOR_AVATAR,
  AUTHOR_FOLLOWERS,
  AUTHOR_HANDLE,
  AUTHOR_NAME,
  AUTHOR_ROOT,
  AUTHOR_VERIFIED,
  METRICS,
  QUOTED_ID,
  REPOSTED_ID,
  TIMELINE_ROOTS,
  TWEET_CREATED_AT,
  TWEET_ID,
  TWEET_SYMBOLS,
  TWEET_TEXT,
  arrayAt,
  boolAt,
  firstOf,
  numberAt,
  recordAt,
  stringAt,
  valueAt,
} from './paths'
import type {
  CatalystAuthor,
  CatalystMetrics,
  CatalystPost,
  CatalystSymbol,
  ParseCoverage,
  ParseResult,
} from './types'

type Json = Record<string, unknown>

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const emptyCoverage = (): ParseCoverage => ({
  instructions: 0,
  unsupportedInstructions: 0,
  entries: 0,
  tweetEntries: 0,
  unsupportedTweetEntries: 0,
  cursorEntries: 0,
  tombstoneEntries: 0,
  otherEntries: 0,
})

/**
 * A post carries a `rest_id` and some text. A user object also carries a
 * `rest_id` but never text, which is what makes the pair a usable test when X
 * omits `__typename` — as it does on the result of a just-published post.
 */
const looksLikeTweet = (value: unknown): boolean =>
  isRecord(value) &&
  firstOf(value, TWEET_ID) !== undefined &&
  firstOf(value, TWEET_TEXT) !== undefined

/**
 * Get to the post itself.
 *
 * X wraps posts whose reach it has limited in `TweetWithVisibilityResults`. The
 * wrapper is not a post: reading it directly finds no text and silently drops
 * the post, which disproportionately drops exactly the posts somebody wanted
 * suppressed.
 */
export const unwrapTweet = (value: unknown): Json | undefined => {
  if (!isRecord(value)) return undefined

  const typeName = value.__typename
  if (typeName === 'Tweet') return value

  if (typeName === 'TweetWithVisibilityResults') {
    const inner = value.tweet
    if (isRecord(inner) && (inner.__typename === 'Tweet' || looksLikeTweet(inner))) {
      return inner
    }
    return undefined
  }

  // Unlabelled but shaped like a post: accepted. Labelled as something else:
  // refused, however tweet-shaped it looks.
  if (typeName === undefined && looksLikeTweet(value)) return value
  return undefined
}

const parseSymbols = (tweet: Json): CatalystSymbol[] =>
  arrayAt(tweet, TWEET_SYMBOLS)
    .filter(isRecord)
    .map((raw) => {
      // X resolves the cashtag for us, three levels down: the ticker and the
      // company name arrive already looked up, so nothing here has to guess what
      // `$NVDAB` refers to.
      const info = valueAt(raw, ['tag', 'info', 'info'])
      return {
        text: String(raw.text ?? '').toUpperCase(),
        ticker: isRecord(info) && typeof info.ticker === 'string' ? info.ticker : undefined,
        name: isRecord(info) && typeof info.name === 'string' ? info.name : undefined,
      }
    })
    .filter((symbol) => symbol.text.length > 0)

const parseAuthor = (tweet: Json): CatalystAuthor => {
  const root = recordAt(tweet, AUTHOR_ROOT) ?? {}
  return {
    handle: stringAt(root, AUTHOR_HANDLE) ?? '',
    name: stringAt(root, AUTHOR_NAME) ?? '',
    followers: numberAt(root, AUTHOR_FOLLOWERS),
    verified: boolAt(root, AUTHOR_VERIFIED),
    avatarUrl: stringAt(root, AUTHOR_AVATAR),
  }
}

const parseMetrics = (tweet: Json): CatalystMetrics => {
  const metrics: CatalystMetrics = {}
  for (const [name, paths] of Object.entries(METRICS)) {
    const value = numberAt(tweet, paths)
    if (value !== undefined) metrics[name as keyof CatalystMetrics] = value
  }
  return metrics
}

const toIso = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

export const parsePost = (value: unknown): CatalystPost | undefined => {
  const tweet = unwrapTweet(value)
  if (!tweet) return undefined

  const id = stringAt(tweet, TWEET_ID)
  if (!id) return undefined

  const author = parseAuthor(tweet)

  return {
    id,
    url: author.handle
      ? `https://x.com/${author.handle}/status/${id}`
      : `https://x.com/i/status/${id}`,
    text: stringAt(tweet, TWEET_TEXT) ?? '',
    createdAt: toIso(stringAt(tweet, TWEET_CREATED_AT)),
    author,
    symbols: parseSymbols(tweet),
    metrics: parseMetrics(tweet),
    quotedPostId: stringAt(tweet, QUOTED_ID),
    repostedPostId: stringAt(tweet, REPOSTED_ID),
  }
}

/**
 * Read a timeline response into posts.
 *
 * The contract that matters: an empty `posts` with `outcome: 'ok'` means X
 * genuinely returned nothing, and only that. If the envelope was not recognised,
 * or entries were seen and none of them understood, the outcome is `drift` —
 * because "no results" and "we stopped being able to read results" look
 * identical from the outside and only one of them is fine.
 */
export const parseTimeline = (body: unknown): ParseResult => {
  const coverage = emptyCoverage()

  if (!isRecord(body)) {
    return { outcome: 'drift', reason: 'MALFORMED_BODY', posts: [], coverage }
  }

  const timeline = firstOf(body, TIMELINE_ROOTS)
  const instructions = arrayAt(timeline, [['instructions']])
  if (!instructions.length) {
    return { outcome: 'drift', reason: 'MISSING_TIMELINE', posts: [], coverage }
  }

  const posts: CatalystPost[] = []
  const seen = new Set<string>()

  for (const instruction of instructions) {
    if (!isRecord(instruction)) continue
    coverage.instructions += 1

    const type = instruction.type
    if (type !== 'TimelineAddEntries' && type !== 'TimelineReplaceEntry') {
      // Pinned entries, module clears, and whatever X adds next. Counted so a
      // response made entirely of unknown instructions reads as drift.
      coverage.unsupportedInstructions += 1
      continue
    }

    for (const entry of arrayAt(instruction, [['entries'], ['entry']])) {
      if (!isRecord(entry)) continue

      // A module is a group of entries wearing one entry's clothes. Search
      // groups matching replies into a conversation module, and reading only
      // the outer entry drops every post inside it. Measured against the
      // captures on hand this costs nothing today — the modules a search
      // timeline actually returns are `TimelineUser` "People" blocks, which are
      // correctly not posts — so this is here for the conversation case, and it
      // can only ever add.
      const inner =
        recordAt(entry, [['content']])?.entryType === 'TimelineTimelineModule'
          ? arrayAt(entry, [['content', 'items']])
              .filter(isRecord)
              .map((wrapper) => recordAt(wrapper, [['item']]) ?? {})
          : [entry]

      for (const node of inner) {
        coverage.entries += 1

        const content = recordAt(node, [['content']]) ?? node
        const item = recordAt(content, [['itemContent']]) ?? {}
        const itemType = item.itemType ?? content.itemType

        if (
          itemType === 'TimelineTimelineCursor' ||
          content.entryType === 'TimelineTimelineCursor'
        ) {
          coverage.cursorEntries += 1
          continue
        }
        if (itemType === 'TimelineTombstone') {
          // A deleted or hidden post. Expected, not drift.
          coverage.tombstoneEntries += 1
          continue
        }
        if (itemType !== 'TimelineTweet') {
          // TimelineSmartTag lands here: it is the cashtag price card, and it is
          // not a post.
          coverage.otherEntries += 1
          continue
        }

        coverage.tweetEntries += 1
        const post = parsePost(valueAt(item, ['tweet_results', 'result']))
        if (!post) {
          coverage.unsupportedTweetEntries += 1
          continue
        }
        if (seen.has(post.id)) continue
        seen.add(post.id)
        posts.push(post)
      }
    }
  }

  const recognisedInstruction = coverage.instructions > coverage.unsupportedInstructions
  if (!recognisedInstruction) {
    return { outcome: 'drift', reason: 'UNSUPPORTED_TIMELINE', posts, coverage }
  }

  if (
    !posts.length &&
    (coverage.unsupportedTweetEntries > 0 || coverage.unsupportedInstructions > 0)
  ) {
    return { outcome: 'drift', reason: 'UNSUPPORTED_TIMELINE', posts, coverage }
  }

  // Partial drift: entries still arrive and some still parse, so nothing looks
  // broken, while a growing share is being dropped. The reference design counts
  // this and never looks at the count, which is how a half-blind parser stays
  // quiet. A fifth is the line.
  if (coverage.tweetEntries > 0 && coverage.unsupportedTweetEntries / coverage.tweetEntries > 0.2) {
    return { outcome: 'drift', reason: 'PARTIAL_DRIFT', posts, coverage }
  }

  return { outcome: 'ok', posts, coverage }
}
