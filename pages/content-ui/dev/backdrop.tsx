/**
 * A stand-in for x.com, for designing against.
 *
 * Two jobs, and they pull in different directions. It has to carry the exact
 * anchors the injection modules query — `AppTabBar_More_Menu`, `primaryColumn`,
 * `cellInnerDiv`, the `role="group"` action bar — or the sidebar button, the
 * tweet buttons and the search card have nothing to attach to and half the
 * surface being designed never appears. And it has to *look* like X, or the
 * panel gets designed against the wrong contrast, the wrong density and the
 * wrong neighbours.
 *
 * This is the design surface only. The e2e suite runs against the real site,
 * so a change here can never move what that suite asserts.
 *
 * Everything lives in the light DOM, exactly as X's own markup does, because
 * that is where the injections look for it.
 */

/** Exactly how X builds a cashtag link — copied from its shipping bundle. */
const Cashtag = ({ symbol }: { symbol: string }) => (
  // The redundant `role="link"` is X's, not ours, and it stays: the cashtag
  // scanner matches on this markup, so "correcting" it here would quietly stop
  // testing what actually ships.
  // eslint-disable-next-line jsx-a11y/no-redundant-roles
  <a dir="ltr" role="link" href={`/search?q=%24${symbol}&src=cashtag_click`} className="x-link">
    ${symbol}
  </a>
)

interface Post {
  id: string
  handle: string
  name: string
  avatar: string
  time: string
  body: React.ReactNode
  replies: number
  reposts: number
  likes: number
}

/** Real bStock tickers, so the resolve call finds something on every one. */
const POSTS: Post[] = [
  {
    id: '1001',
    handle: 'macro_daily',
    name: 'Macro Daily',
    avatar: '#1d9bf0',
    time: '2h',
    body: (
      <>
        Earnings week and <Cashtag symbol="NVDA" /> is the only print that matters. Everything else
        trades off the guide.
      </>
    ),
    replies: 42,
    reposts: 18,
    likes: 310,
  },
  {
    id: '1002',
    handle: 'chainwatch',
    name: 'Chainwatch',
    avatar: '#00ba7c',
    time: '4h',
    body: (
      <>
        Tokenized <Cashtag symbol="TSLA" /> on BSC is now deeper than it was all quarter. Spread is
        finally tight enough to matter.
      </>
    ),
    replies: 12,
    reposts: 7,
    likes: 96,
  },
  {
    id: '1003',
    handle: 'deskn0tes',
    name: 'desk notes',
    avatar: '#f91880',
    time: '6h',
    body: (
      <>
        Rotation out of <Cashtag symbol="MSTR" /> and into <Cashtag symbol="COIN" /> all week. Same
        trade, better balance sheet.
      </>
    ),
    replies: 88,
    reposts: 24,
    likes: 512,
  },
  {
    id: '1004',
    handle: 'quantgirl',
    name: 'quant',
    avatar: '#7856ff',
    time: '9h',
    body: (
      <>
        <Cashtag symbol="PLTR" /> multiple only works if you believe the government book compounds.
        I don&apos;t.
      </>
    ),
    replies: 205,
    reposts: 40,
    likes: 1290,
  },
  {
    id: '1005',
    handle: 'bondsonly',
    name: 'bonds only',
    avatar: '#ffd400',
    time: '11h',
    // A real cashtag with no tokenized counterpart: no button should appear.
    body: (
      <>
        Parking cash in <Cashtag symbol="AGG" /> until the front end stops lying.
      </>
    ),
    replies: 3,
    reposts: 0,
    likes: 21,
  },
]

const NAV = [
  { label: 'Home', icon: '⌂', testid: 'AppTabBar_Home_Link', active: true },
  { label: 'Explore', icon: '⌕', testid: 'AppTabBar_Explore_Link' },
  { label: 'Notifications', icon: '◔', testid: 'AppTabBar_Notifications_Link' },
  { label: 'Messages', icon: '✉', testid: 'AppTabBar_DirectMessage_Link' },
  { label: 'Profile', icon: '☻', testid: 'AppTabBar_Profile_Link' },
  // The anchor the sidebar button injects next to. Without it there is no button.
  { label: 'More', icon: '⋯', testid: 'AppTabBar_More_Menu' },
]

const ActionBar = ({ post }: { post: Post }) => (
  // `role="group"` with no test id, which is how X marks the action bar — and
  // also how it marks a media carousel, which is why the injection has to tell
  // them apart rather than take the first match.
  <div role="group" className="x-actions">
    <button data-testid="reply" aria-label={`${post.replies} Replies`}>
      <span aria-hidden>◗</span> {post.replies}
    </button>
    <button data-testid="retweet" aria-label={`${post.reposts} reposts`}>
      <span aria-hidden>⇄</span> {post.reposts}
    </button>
    <button data-testid="like" aria-label={`${post.likes} Likes`}>
      <span aria-hidden>♡</span> {post.likes}
    </button>
    <button data-testid="bookmark" aria-label="Bookmark">
      <span aria-hidden>⛉</span>
    </button>
  </div>
)

const Tweet = ({ post }: { post: Post }) => (
  <article data-testid="tweet" data-stub-id={post.id} className="x-tweet">
    <div className="x-avatar" style={{ background: post.avatar }} aria-hidden />
    <div className="x-tweet-body">
      <div data-testid="User-Name" className="x-names">
        <a href={`/${post.handle}`}>
          <span dir="ltr" className="x-name">
            {post.name}
          </span>
        </a>
        <span className="x-handle">@{post.handle}</span>
        <span className="x-dot">·</span>
        <a href={`/${post.handle}/status/${post.id}`} className="x-time">
          <time dateTime="2026-09-21T06:00:00Z">{post.time}</time>
        </a>
      </div>
      <div data-testid="tweetText" dir="auto" lang="en" className="x-text">
        {post.body}
      </div>
      <ActionBar post={post} />
    </div>
  </article>
)

/**
 * X's own price card, which has no test id of its own.
 *
 * What identifies it is being a timeline cell with no `article` inside. The
 * search card anchors relative to it, so leaving it out means anchoring is never
 * exercised (a mistake an earlier stub page shipped once).
 */
const PriceCard = () => (
  <div className="x-pricecard">
    <div className="x-pricecard-name">NVIDIA Corp</div>
    <div className="x-pricecard-meta">NVDA · NASDAQ · $5.4T MC · USD</div>
    <div className="x-pricecard-price">$224.14</div>
    <div className="x-pricecard-chart" aria-hidden />
  </div>
)

export const Backdrop = () => (
  <div className="x-root">
    <nav className="x-rail" aria-label="Primary">
      <div className="x-logo" aria-hidden>
        𝕏
      </div>
      {NAV.map((item) => (
        <a
          key={item.testid}
          href="/"
          data-testid={item.testid}
          className={`x-navitem${item.active ? 'is-active' : ''}`}
          onClick={(event) => event.preventDefault()}>
          <span className="x-navicon" aria-hidden>
            {item.icon}
          </span>
          <span className="x-navlabel">{item.label}</span>
        </a>
      ))}
      <button type="button" className="x-post">
        Post
      </button>
    </nav>

    <main className="x-center">
      <div data-testid="primaryColumn" className="x-column">
        <header className="x-colhead">
          <span className="x-coltitle">For you</span>
          <span className="x-coltab">Following</span>
        </header>
        {/* Virtualised: absolutely positioned cells inside a relative container,
            placed with a transform. A card inserted as a plain sibling of one of
            these ignores the coordinate system and lands at the origin. */}
        <div className="x-cells">
          <div data-testid="cellInnerDiv" className="x-cell">
            <PriceCard />
          </div>
          {POSTS.map((post) => (
            <div key={post.id} data-testid="cellInnerDiv" className="x-cell">
              <Tweet post={post} />
            </div>
          ))}
        </div>
      </div>
    </main>

    {/* X's right column. Present mostly so the panel is not designed against an
        empty gutter it will never actually have. */}
    <aside className="x-side">
      <div className="x-search">Search</div>
      <section className="x-widget">
        <h2>What&apos;s happening</h2>
        {['#Earnings', '$NVDA', 'Tokenized equities', '#BNBChain'].map((trend) => (
          <div key={trend} className="x-trend">
            <div className="x-trend-cat">Business · Trending</div>
            <div className="x-trend-name">{trend}</div>
            <div className="x-trend-count">
              {(Math.floor(Math.random() * 90) + 10).toString()}K posts
            </div>
          </div>
        ))}
      </section>
    </aside>
  </div>
)
