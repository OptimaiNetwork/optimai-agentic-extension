import type { CardBase, ResearchCard } from '@extension/shared'
import { FileText, PieChart, Scale, Search, ShieldCheck, Wallet } from 'lucide-react'
import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'
import { Component, type ReactNode } from 'react'

import { BackingCardBody, BackingChip, BackingFooter } from './backing-card-body'
import { CardToken, Chip, IconPlate, Stat, chainName, listingFor } from './card-kit'
import { ClaimCheckBody, VerdictChip } from './claim-check-body'
import {
  IssuerCluster,
  IssuerComparisonBody,
  MarketSessionChip,
  MarketSnapshotBody,
  MarketSnapshotFooter,
  listedCount,
} from './market-card-body'
import {
  LiquidityPlate,
  MarketsCardBody,
  MarketsChainChip,
  MarketsFooter,
  marketSymbol,
} from './markets-card-body'
import { PortfolioCardBody, PortfolioChains, PortfolioFooter } from './portfolio-card-body'
import { TradeAnalysisBody, TradeAnalysisFooter } from './trade-analysis-body'
import { NotSignedChip, TradeIntentCardBody } from './trade-intent-card-body'
import { PostEvidenceList } from './post-evidence-list'
import { PriceChartBody, PriceChartFooter, SpanChip, cadence } from './price-chart-body'
import { ResearchCardShell, venueLabel } from './research-card-shell'
import { SampleSizeChip, SentimentFooter, StanceTally } from './stance-tally'
import { XLogoIcon } from './x-icons'

/**
 * A card that fails cannot take the answer with it.
 *
 * Validation upstream catches shape problems; this catches the rest — a date
 * that will not format, a renderer bug reached only by one payload. The message
 * keeps its prose and its other cards, and the reader is told which piece is
 * missing rather than being shown a blank panel. Quietly: a dashed slot, not
 * a red box, because the answer still reads.
 */
export class CardBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return <UnavailableSlot label="This card could not be displayed" />
    }
    return this.props.children
  }
}

/** A dashed placeholder in the slot a card would have taken. */
export const UnavailableSlot = ({ label }: { label: string }) => (
  <div className="border-border-strong text-12 text-faint flex items-center gap-2.5 rounded-xl border border-dashed px-3 py-2.5 leading-4">
    <FileText className="size-4 shrink-0" />
    <span>{label}. The rest of the answer is unaffected.</span>
  </div>
)

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']

/** "Two wallets": a small count at the head of a sentence reads as a word. */
const countWord = (count: number, word: string): string =>
  count < WORDS.length ? `${WORDS[count]} ${word}${count === 1 ? '' : 's'}` : plural(count, word)

/** "Ondo · Solana" for a card's chain-specific venue key. */
const listingLabel = (venue?: string | null): string | undefined => {
  const listing = listingFor(venue)
  const issuer = venueLabel(venue)
  return listing ? `${issuer} · ${chainName(listing.chain)}` : issuer
}

/** "Ondo on Solana": the issuer, then the chain it lists on. */
const issuerOnChain = (venue?: string | null): string | undefined => {
  const listing = listingFor(venue)
  return listing ? `${venueLabel(venue)} on ${chainName(listing.chain)}` : undefined
}

const WINDOW = (card: {
  window: { earliestPostAt?: string | null; latestPostAt?: string | null }
}) => {
  const from = Date.parse(card.window.earliestPostAt ?? '')
  const to = Date.parse(card.window.latestPostAt ?? '')
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return undefined
  const hours = Math.max(1, Math.round((to - from) / 3_600_000))
  return hours <= 36 ? `last ${hours} hours` : `last ${Math.round(hours / 24)} days`
}

const CardBody = ({ card }: { card: ResearchCard }) => {
  const ticker = card.subject.ticker.replace(/^\$/, '').toUpperCase()
  const token = <CardToken ticker={ticker} venueKey={card.subject.venue} />
  // The token's own symbol (NVDAon, TSLAB) names a price card; the card carries
  // only the ticker, and the catalog lookup is the one the logo already made.
  const resolved = useResolveCashtag(ticker, {
    selection: listingFor(card.subject.venue),
    enabled:
      card.kind === 'market-snapshot' ||
      card.kind === 'price-chart' ||
      card.kind === 'backing' ||
      card.kind === 'trade-analysis',
  })
  const symbol = resolved.data?.symbol ?? ticker
  const company = card.subject.companyName ?? resolved.data?.underlying_name ?? undefined

  switch (card.kind) {
    case 'search-results': {
      const window = WINDOW(card)
      return (
        <ResearchCardShell
          title={`${ticker} on X`}
          subtitle={`Read from your own X tab${window ? `, ${window}` : ''}`}
          icon={
            <IconPlate tone="x">
              <XLogoIcon className="size-3.5" />
            </IconPlate>
          }
          trailing={<Chip>{plural(card.sample.collected, 'post')}</Chip>}
          status={card.status}
          limitations={card.limitations}>
          <div className="flex items-center gap-2 px-3.5 py-3">
            <span className="flex h-8 flex-1 items-center gap-2 rounded-[9px] border border-[#323232] bg-[#242424] px-2.5">
              <Search aria-hidden className="size-3.5 text-[#9a9a9a]" strokeWidth={1.75} />
              <span className="text-12 truncate text-[#c4c4c4]">{card.query}</span>
              <span className="ml-auto text-[10px] text-[#9a9a9a]">
                {card.mode === 'top' ? 'Top' : 'Latest'}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 px-3.5 pb-3">
            <Stat label="Collected" value={plural(card.sample.collected, 'post')} />
            <Stat label={`About ${ticker}`} value={plural(card.sample.relevant, 'post')} />
            <Stat label="Authors" value={String(card.sample.authors)} />
          </div>
          <PostEvidenceList posts={card.posts} />
        </ResearchCardShell>
      )
    }
    case 'sentiment':
      return (
        <ResearchCardShell
          title={`How X reads ${ticker}`}
          subtitle={`${plural(card.sample.relevant, 'post')} about ${ticker} from ${plural(card.sample.authors, 'author')}`}
          icon={
            <IconPlate>
              <PieChart strokeWidth={1.75} />
            </IconPlate>
          }
          trailing={<SampleSizeChip sample={card.sample} />}
          status={card.status}
          limitations={card.limitations}
          footer={<SentimentFooter />}>
          <StanceTally counts={card.counts} sample={card.sample} />
          <PostEvidenceList posts={card.posts} annotations={card.annotations} initial={0} />
        </ResearchCardShell>
      )
    case 'market-snapshot':
      return (
        <ResearchCardShell
          title={symbol}
          subtitle={[company, listingLabel(card.subject.venue)].filter(Boolean).join(' on ')}
          icon={token}
          trailing={<MarketSessionChip session={card.marketSession} />}
          status={card.status}
          limitations={card.limitations}
          footer={<MarketSnapshotFooter card={card} />}>
          <MarketSnapshotBody card={card} />
        </ResearchCardShell>
      )
    case 'markets':
      return (
        <ResearchCardShell
          title={`Where ${marketSymbol(card)} trades`}
          subtitle={[listingLabel(card.subject.venue), 'pools by liquidity']
            .filter(Boolean)
            .join(', ')}
          icon={<LiquidityPlate />}
          trailing={<MarketsChainChip card={card} />}
          status={card.status}
          limitations={card.limitations}
          footer={<MarketsFooter card={card} />}>
          <MarketsCardBody card={card} />
        </ResearchCardShell>
      )
    case 'portfolio':
      return (
        <ResearchCardShell
          title="Your positions"
          subtitle={`${countWord(card.walletCount, 'wallet')}, ${plural(card.tradeCount, 'trade')} made in this panel`}
          icon={
            <IconPlate>
              <Wallet strokeWidth={1.75} />
            </IconPlate>
          }
          trailing={<PortfolioChains card={card} />}
          status={card.status}
          limitations={card.limitations}
          footer={<PortfolioFooter />}>
          <PortfolioCardBody card={card} />
        </ResearchCardShell>
      )
    case 'trade-intent':
      return (
        <ResearchCardShell
          title={card.title}
          subtitle="Indicative, you confirm on the trade screen"
          icon={<CardToken ticker={ticker} venueKey={card.subject.venue} chain={card.chain} />}
          trailing={<NotSignedChip />}
          status={card.status}
          limitations={card.limitations}>
          <TradeIntentCardBody card={card} />
        </ResearchCardShell>
      )
    case 'issuer-comparison':
      return (
        <ResearchCardShell
          title={`${ticker} across issuers`}
          subtitle="Adjusted prices on every venue"
          icon={<IssuerCluster rows={card.rows} />}
          trailing={<Chip>{listedCount(card)}</Chip>}
          status={card.status}
          limitations={card.limitations}>
          <IssuerComparisonBody card={card} />
        </ResearchCardShell>
      )
    case 'price-chart':
      return (
        <ResearchCardShell
          title={symbol}
          subtitle={[`${cadence(card.interval)} closes`, listingLabel(card.subject.venue)]
            .filter(Boolean)
            .join(' on ')}
          icon={token}
          trailing={<SpanChip card={card} />}
          status={card.status}
          limitations={card.limitations}
          footer={<PriceChartFooter card={card} />}>
          <PriceChartBody card={card} />
        </ResearchCardShell>
      )
    case 'backing':
      return (
        <ResearchCardShell
          title={`What backs ${symbol}`}
          subtitle={issuerOnChain(card.subject.venue) ?? card.issuerLabel}
          icon={
            <IconPlate tone="green">
              <ShieldCheck strokeWidth={1.9} />
            </IconPlate>
          }
          trailing={<BackingChip card={card} />}
          status={card.status}
          limitations={card.limitations}
          footer={<BackingFooter />}>
          <BackingCardBody card={card} />
        </ResearchCardShell>
      )
    case 'trade-analysis':
      // No partial caveat: a signal that could not be read is already a dimmed
      // row saying why, and an amber line repeating it would read as a warning
      // about the whole analysis.
      return (
        <ResearchCardShell
          title={`${ticker} trade analysis`}
          subtitle={[company, listingLabel(card.subject.venue)].filter(Boolean).join(' on ')}
          icon={<CardToken ticker={ticker} venueKey={card.subject.venue} chain={card.chain} />}
          trailing={<MarketSessionChip session={card.marketSession} />}
          footer={<TradeAnalysisFooter card={card} />}>
          <TradeAnalysisBody card={card} />
        </ResearchCardShell>
      )
    case 'claim-check':
      return (
        <ResearchCardShell
          title="Claim check"
          subtitle="Held against filings and announcements"
          icon={
            <IconPlate>
              <Scale strokeWidth={1.75} />
            </IconPlate>
          }
          trailing={<VerdictChip card={card} />}
          status={card.status}
          limitations={card.limitations}>
          <ClaimCheckBody card={card} />
        </ResearchCardShell>
      )
    default: {
      // Every kind in *this* build's union is handled above, so TypeScript
      // narrows here to `never`. The branch stays because the union is a
      // snapshot of one build: a newer server, or a checkpoint written by one,
      // can carry a kind this code has never heard of. Naming it beats
      // rendering nothing and letting the reader wonder what is missing.
      const unknown = card as CardBase & { kind: string }
      return <UnavailableSlot label={`“${unknown.title}” needs a newer version of the panel`} />
    }
  }
}

export const ResearchCardRenderer = ({ card }: { card: ResearchCard }) => (
  <CardBoundary>
    <CardBody card={card} />
  </CardBoundary>
)
