/**
 * X renders a cashtag as an anchor, so its own tokenizer has already decided
 * what counts as one. Verified against X's shipping bundle: the href it builds
 * is `/search?q=%24TSLA&src=cashtag_click`, and the anchor carries no
 * `data-testid` of its own.
 *
 * Matching the anchor rather than regexing the text means "$50" and "US$" and a
 * dollar sign inside a URL are never mistaken for a ticker.
 */
const CASHTAG_LINK = 'a[href*="=cashtag_click"]'
const TWEET_TEXT = '[data-testid="tweetText"]'
const QUOTED_TWEET = '[data-testid="quotedTweet"]'

/** `/search?q=%24NVDA&src=cashtag_click` -> `NVDA`. Case is preserved upstream. */
const symbolFromHref = (href: string): string | null => {
  const query = href.split('?')[1]
  if (!query) return null
  const raw = new URLSearchParams(query).get('q')
  return raw?.startsWith('$') ? raw.slice(1).toUpperCase() : null
}

export const cashtagOfAnchor = (anchor: HTMLAnchorElement): string | null =>
  symbolFromHref(anchor.getAttribute('href') ?? '')

/** The tweet's own cashtag links, excluding any quoted post inside the card. */
export const cashtagLinksIn = (tweet: Element): HTMLAnchorElement[] => {
  const quoted = tweet.querySelector(QUOTED_TWEET)
  return Array.from(
    tweet.querySelectorAll<HTMLAnchorElement>(`${TWEET_TEXT} ${CASHTAG_LINK}`)
  ).filter((anchor) => !quoted?.contains(anchor))
}

/** The tweet's own text element where the market pill can sit above the copy. */
export const tweetTextOf = (tweet: Element): HTMLElement | null => {
  const quoted = tweet.querySelector(QUOTED_TWEET)
  return (
    Array.from(tweet.querySelectorAll<HTMLElement>(TWEET_TEXT)).find(
      (text) => !quoted?.contains(text)
    ) ?? null
  )
}

/**
 * Every cashtag in a tweet's own text, in the order X wrote them.
 *
 * A quoted tweet is somebody else's post rendered inside this one, so its
 * cashtags belong to it and not here — otherwise quoting a ticker mention would
 * put a button on a tweet that never named the ticker.
 */
export const cashtagsIn = (tweet: Element): string[] => {
  const seen = new Set<string>()
  for (const anchor of cashtagLinksIn(tweet)) {
    const symbol = cashtagOfAnchor(anchor)
    if (symbol) seen.add(symbol)
  }

  return [...seen]
}

/**
 * The tweet's own id, taken from the permalink around its timestamp.
 *
 * X exposes no `data-*` id, and a naive `a[href*="/status/"]` lookup finds the
 * quoted tweet's link on a quote post. The `time` element only exists in the
 * outer tweet's permalink.
 */
export const tweetIdOf = (tweet: Element): string | null => {
  const quoted = tweet.querySelector(QUOTED_TWEET)

  for (const time of Array.from(tweet.querySelectorAll('time'))) {
    if (quoted?.contains(time)) continue
    const link = time.closest('a')
    const id = link?.getAttribute('href')?.match(/\/status\/(\d+)/)?.[1]
    if (id) return id
  }
  return null
}

/**
 * Where the button goes: the action bar holding reply, repost and like.
 *
 * `[role="group"]` alone is not unique inside an article — X uses the same role
 * for a multi-photo carousel, and querySelector returns the first match in
 * document order, which is the carousel. Anchoring on the reply button pins it
 * to the bar we mean.
 */
export const actionBarOf = (tweet: Element): Element | null =>
  tweet.querySelector('[role="group"]:has([data-testid="reply"])')
