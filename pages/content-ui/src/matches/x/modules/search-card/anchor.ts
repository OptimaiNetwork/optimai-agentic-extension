/**
 * Where our card goes on a cashtag search page, and when.
 *
 * X's own price card has no `data-testid` of its own — confirmed against its
 * shipping bundle, where the entire smart-tag subtree carries three, two of them
 * on the loading skeleton. So it cannot be selected directly. What it *is* is an
 * ordinary timeline entry, wrapped like every other one in
 * `[data-testid="cellInnerDiv"]` — and unlike every other one, it contains no
 * `article`. That absence is the handle.
 */

const PRIMARY_COLUMN = '[data-testid="primaryColumn"]'
const CELL = '[data-testid="cellInnerDiv"]'

/**
 * The ticker a cashtag search is for, or null.
 *
 * Read from the URL rather than the page: X puts `src=cashtag_click` into the
 * hrefs of its own Top / Latest / People / Media / Lists tabs when you arrive by
 * clicking a cashtag, so a page-wide anchor query returns five nav links before
 * it returns anything about a company.
 */
export const cashtagOfSearch = (href: string = window.location.href): string | null => {
  const url = new URL(href, 'https://x.com')
  if (url.pathname !== '/search') return null

  const query = url.searchParams.get('q')?.trim()
  if (!query?.startsWith('$')) return null

  const ticker = query.slice(1).split(/\s/)[0].toUpperCase()
  return /^[A-Z0-9.]{1,12}$/.test(ticker) ? ticker : null
}

/**
 * X's own card, when it rendered one: the timeline cell containing no article.
 *
 * Falls back to the first cell, because X has no card for every ticker — and
 * the tickers it has none for are exactly the ones where ours is the only thing
 * on the page.
 */
export const anchorIn = (root: ParentNode = document): Element | null => {
  const column = root.querySelector(PRIMARY_COLUMN)
  if (!column) return null

  for (const cell of Array.from(column.querySelectorAll(CELL))) {
    if (!cell.querySelector('article')) return cell
  }
  return column.querySelector(CELL)
}

/**
 * Where to put our card so that it is laid out at all.
 *
 * Not next to X's card, which is the obvious answer and is wrong. Their
 * timeline is virtualised: every cell is `position: absolute` inside one
 * relative container, placed with a `translateY`. A sibling inserted next to an
 * absolutely positioned element is not "after" it in any visual sense — it
 * ignores that coordinate system entirely and lands at the container's origin.
 * Measured on the live site: X's card at top=107, ours at top=107, one drawn
 * straight over the other with the text of each unreadable through the other.
 *
 * So the card goes immediately *before* the whole virtualised list, in ordinary
 * flow, where nothing X does with transforms can reach it. That puts it above
 * their card rather than below, which is the trade: a correct price the reader
 * sees first, instead of a correct price underneath an incorrect one.
 *
 * Returns the node to insert before, and its parent.
 */
export const insertionPointIn = (
  root: ParentNode = document
): { parent: Node; before: Node } | null => {
  const column = root.querySelector(PRIMARY_COLUMN)
  if (!column) return null

  const cell = anchorIn(root)
  // The list container holds the absolutely positioned cells. Without a cell
  // yet — an empty or still-loading timeline — there is nothing to sit above.
  const list = cell?.parentElement
  if (!list?.parentNode) return null

  return { parent: list.parentNode, before: list }
}
