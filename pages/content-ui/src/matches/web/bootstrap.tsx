import { getSelection, loadSelection } from '@x/modules/venue'
import { isDarkPage } from '@x/modules/ticker-popover'
import pillCss from '@x/modules/ticker-popover/pill.css?inline'
import popoverCss from '@x/modules/ticker-popover/popover.css?inline'
import QueryProvider from '@x/providers/query'
import { createRoot } from 'react-dom/client'
// Compiled by Tailwind (build.mts runs it per entry before Vite), not the source.
import hostCss from '../../../dist/web/index.css?inline'
import badgeCss from './styles/badge.css?inline'

import { BadgeLayer } from './badges/badge-layer'
import { addBadges, pruneBadges, type PageBadge } from './badges/store'
import { HoverLayer } from './hover/hover-layer'
import { TradePanel } from './trade/trade-panel'
import { listingForMention } from './lexicon/listing'
import { loadLexicon } from './lexicon/store'
import { isBadgeKind } from './scan/badge'
import { compileMatcher } from './scan/matcher'
import { HOST_ID } from './scan/dom'
import { createScanner, type ScanStats } from './scan/scanner'
import type { Lexicon } from './services/types'

/** How often badges whose mention the page removed are let go. */
const PRUNE_EVERY_MS = 5_000

/** Is this a document we should touch at all: an HTML page with a body, not an image, PDF or XML view. */
const isHtmlPage = (): boolean =>
  document.contentType === 'text/html' && document.body instanceof HTMLBodyElement

/**
 * The host for the popover: a shadow root on the root element, so the page's CSS
 * cannot reach the card and ours cannot reach the page.
 *
 * On `<html>` rather than `<body>` because a body with a transform would become
 * the containing block of a fixed-position card, and a single-page app may
 * replace its body wholesale.
 */
const mountHost = (): { host: HTMLElement; layer: HTMLElement } => {
  const host = document.createElement('div')
  host.id = HOST_ID
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;'
  document.documentElement.append(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(`${hostCss}\n${popoverCss}`)
  shadow.adoptedStyleSheets = [sheet]

  const layer = document.createElement('div')
  layer.id = 'catalyst-web-layer'
  shadow.append(layer)
  return { host, layer }
}

/** Written onto the host so an end-to-end test, or a person in DevTools, can read what the scan did. */
const reportStats = (host: HTMLElement, stats: ScanStats, terms: number) => {
  host.dataset.terms = String(terms)
  host.dataset.textNodes = String(stats.textNodes)
  host.dataset.badges = String(stats.badges)
  host.dataset.tickers = String(stats.tickers)
  host.dataset.scanMs = String(stats.scanMs)
  host.dataset.scanDone = String(stats.done)
}

/**
 * Turns the scanner's badge elements into badges with a pill: a shadow root
 * sharing one stylesheet, the page's theme, and the listing the pill shows.
 * A mention with no quotable listing loses its badge, and so frees its key.
 */
const createBadgeMaker = (lexicon: Lexicon) => {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(`${pillCss}\n${popoverCss}\n${badgeCss}`)
  const theme = isDarkPage() ? 'is-dark' : 'is-light'
  let nextId = 0

  return (hosts: readonly HTMLElement[]): PageBadge[] => {
    const made: PageBadge[] = []
    for (const host of hosts) {
      const { key = '', ticker = '', kind, term = '' } = host.dataset
      const listing = isBadgeKind(kind)
        ? listingForMention(ticker, kind, term, lexicon, getSelection())
        : null
      if (!listing) {
        host.remove()
        continue
      }
      host.dataset.chain = listing.chain
      host.dataset.venue = listing.venue
      host.classList.add(theme)
      const mount = host.attachShadow({ mode: 'open' })
      mount.adoptedStyleSheets = [sheet]
      made.push({ id: nextId++, key, host, mount, ticker, listing })
    }
    return made
  }
}

/**
 * Scans this page and puts X's market pill after the first mention of each
 * tokenized stock it names — once per company, ticker and symbol — with a card
 * behind every pill.
 *
 * Exported for the design harness (`pages/content-ui/dev/web.html`), which runs
 * exactly this on an ordinary page with the extension platform shimmed.
 */
export const startPageHighlighting = async (): Promise<void> => {
  if (!isHtmlPage() || document.getElementById(HOST_ID)) return

  const [lexicon] = await Promise.all([loadLexicon(), loadSelection()])
  if (!lexicon) return

  const matcher = compileMatcher(lexicon.terms)
  const { host, layer } = mountHost()
  const makeBadges = createBadgeMaker(lexicon)

  createRoot(layer).render(
    <QueryProvider>
      <BadgeLayer lexicon={lexicon} />
      <HoverLayer lexicon={lexicon} />
      <TradePanel />
    </QueryProvider>
  )

  const scanner = createScanner({
    root: document.body,
    matcher,
    onBadges: (hosts) => addBadges(makeBadges(hosts)),
    onStats: (stats) => reportStats(host, stats, lexicon.terms.length),
  })
  host.dataset.lexiconVersion = lexicon.version
  scanner.start()
  setInterval(pruneBadges, PRUNE_EVERY_MS)
}
