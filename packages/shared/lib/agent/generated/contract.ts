/* Generated from research-contract.schema.json. Do not edit. */

export type Code = string
export type Count = number | null
export type Detail = string | null
export type Executionid = string | null
export type Finishedat = string | null
export type Id = string
export type Startedat = string
export type Status = 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted'
export type Toolcallid = string | null
export type Total = number | null
export type Runid = string
export type Status1 = 'running' | 'completed' | 'cancelled' | 'failed' | 'expired'
/**
 * @maxItems 40
 */
export type Steps = ActivityStep[]
export type Version = 1
export type Chain = string
export type Contractaddress = string | null
export type Currency = string
export type Multiplier = string | null
export type Observedat = string | null
export type Referenceprice = string | null
export type Sourceid = string | null
export type Symbol = string
export type Tokenprice = string | null
export type Tradable = boolean | null
export type Unavailablereason = string | null
export type Venue = string
export type Venuelabel = string
export type Asof = string | null
export type Basis = 'token' | 'share' | 'reference'
export type Currency1 = string
export type Sourceid1 = string | null
export type Value = string
export type Quantity = string
export type Symbol1 = string
export type Unrealizedpnlpercent = string | null
export type Weightpercent = string | null
export type Key = 'volatility' | 'liquidity' | 'premium' | 'session' | 'concentration'
export type Level = 'low' | 'medium' | 'high'
export type Reading = string
export type Key1 = 'trend' | 'growth' | 'sentiment' | 'valuation' | 'momentum'
export type Lean = ('bullish' | 'neutral' | 'bearish') | null
export type Reading1 = string
export type Score = string | null
export type Buy = number
export type Hold = number
export type Sell = number
export type Companyname = string | null
export type Dailyreporturl = string | null
export type Fetchedat = string | null
export type Issuerlabel = string
export type Kind = 'backing'
/**
 * @maxItems 8
 */
export type Limitations = string[]
export type Monthlyreporturl = string | null
export type Observedat1 = string
export type Reportedat = string | null
/**
 * @maxItems 64
 */
export type Sourceids = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids = string[]
export type Status2 = 'complete' | 'partial' | 'unavailable'
export type Chain1 = string | null
export type Companyname1 = string | null
export type Ticker = string
export type Venue1 = string | null
export type Title = string
export type Version1 = 1
export type Close = string
export type High = string
export type Low = string
export type Open = string
export type Session = string | null
export type Time = string
export type Volume = string | null
export type Excerpt = string | null
export type Kind1 = 'sec_filing' | 'company_announcement' | 'x_post'
export type Observedat2 = string
export type Publishedat = string | null
export type Publisher = string
export type Sourceid2 = string | null
export type Title1 = string
export type Url = string | null
export type Verdict = 'supports' | 'contradicts' | 'unaddressed' | 'unread'
export type Claim = string
export type Kind2 = 'claim-check'
/**
 * @maxItems 8
 */
export type Limitations1 = string[]
export type Observedat3 = string
export type Primarychecked = number
export type Primarycontradicting = number
export type Primarysupporting = number
/**
 * @maxItems 64
 */
export type Sourceids1 = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids1 = string[]
/**
 * @maxItems 24
 */
export type Sources = CheckedSource[]
export type Status3 = 'complete' | 'partial' | 'unavailable'
export type Title2 = string
export type Verdict1 = 'corroborated' | 'contradicted' | 'mixed' | 'unverified'
export type Version2 = 1
export type Kind3 = 'issuer-comparison'
/**
 * @maxItems 8
 */
export type Limitations2 = string[]
export type Observedat4 = string
/**
 * @maxItems 5
 */
export type Rows = ComparisonRow[]
/**
 * @maxItems 64
 */
export type Sourceids2 = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids2 = string[]
export type Status4 = 'complete' | 'partial' | 'unavailable'
export type Title3 = string
export type Version3 = 1
export type Gappercent = string | null
export type Kind4 = 'market-snapshot'
/**
 * @maxItems 8
 */
export type Limitations3 = string[]
export type Marketcap = string | null
export type Marketsession = string | null
export type Multiplier1 = string | null
export type Observedat5 = string
export type Pricechangepct24H = string | null
/**
 * @maxItems 64
 */
export type Sourceids3 = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids3 = string[]
export type Status5 = 'complete' | 'partial' | 'unavailable'
export type Title4 = string
export type Totalsupply = string | null
export type Version4 = 1
export type Volume24H = string | null
export type Id1 = string
export type Liquidityusd = string | null
/**
 * The requested token first
 */
export type Pair = string
export type Priceusd = string | null
export type Url1 = string | null
/**
 * The protocol, named as the source names it
 */
export type Venue2 = string
export type Volume24Husd = string | null
export type Chain2 = 'bnb' | 'solana'
export type Coverage = 'complete' | 'partial' | 'unknown'
export type Fetchedat1 = string | null
export type Kind5 = 'markets'
/**
 * @maxItems 8
 */
export type Limitations4 = string[]
/**
 * @maxItems 12
 */
export type Markets = MarketVenueRow[]
export type Observedat6 = string
export type Pricespreadpercent = string | null
/**
 * Which directory answered
 */
export type Source = string
/**
 * @maxItems 64
 */
export type Sourceids4 = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids4 = string[]
export type Spreadvenuecount = number
export type Status6 = 'complete' | 'partial' | 'unavailable'
export type Title5 = string
export type Totalcount = number
export type Version5 = 1
export type Earliestpostat = string | null
export type Latestpostat = string | null
export type Requestedfrom = string | null
export type Requestedto = string | null
export type Costbasis = string
export type Kind6 = 'portfolio'
/**
 * @maxItems 8
 */
export type Limitations5 = string[]
export type Marketvalue = string | null
export type Observedat7 = string
export type Openpositioncount = number
export type Averageentryprice = string | null
export type Chain3 = 'bnb' | 'solana'
export type Currentprice = string | null
export type Marketvalue1 = string | null
export type Quantity1 = string
export type Ticker1 = string
export type Unrealizedpnl = string | null
export type Unrealizedpnlpercent1 = string | null
export type Venue3 = string
export type Weightpercent1 = string | null
/**
 * @maxItems 10
 */
export type Positions = PortfolioPositionRow[]
export type Pricedpositioncount = number
export type Realizedpnl = string
/**
 * @maxItems 64
 */
export type Sourceids5 = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids5 = string[]
export type Status7 = 'complete' | 'partial' | 'unavailable'
export type Title6 = string
export type Totalpnl = string | null
export type Tradecount = number
export type Unrealizedpnl1 = string | null
export type Version6 = 1
export type Walletcount = number
export type Winratepercent = string | null
export type Avatarurl = string | null
export type Followers = number | null
export type Handle = string
export type Name = string
export type Verified = boolean
export type Likes = number | null
export type Observedat8 = string | null
export type Replies = number | null
export type Reposts = number | null
export type Views = number | null
export type Basis1 = 'token' | 'share' | 'reference'
/**
 * @maxItems 200
 */
export type Candles = Candle[]
export type Currency2 = string
export type Fetchedat2 = string | null
export type Interval = string
export type Kind7 = 'price-chart'
/**
 * @maxItems 8
 */
export type Limitations6 = string[]
export type Observedat9 = string
/**
 * @maxItems 64
 */
export type Sourceids6 = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids6 = string[]
export type Status8 = 'complete' | 'partial' | 'unavailable'
export type Title7 = string
export type Version7 = 1
export type Id2 = string
export type Observedat10 = string
export type Publishedat1 = string | null
export type Quotedpostid = string | null
export type Repostedpostid = string | null
export type Sourceid3 = string | null
export type Text = string
export type Truncated = boolean
export type Url2 = string
export type Authors = number
export type Classified = number
export type Collected = number
export type Deduplicated = number
export type Relevant = number
export type Evidenceid = string
export type Kind8 = 'search-results'
/**
 * @maxItems 8
 */
export type Limitations7 = string[]
export type Mode = 'latest' | 'top'
export type Observedat11 = string
/**
 * @maxItems 40
 */
export type Posts = ResearchPostSnapshot[]
export type Query = string
/**
 * @maxItems 64
 */
export type Sourceids7 = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids7 = string[]
export type Status9 = 'complete' | 'partial' | 'unavailable'
export type Title8 = string
export type Version8 = 1
export type Confidence = number | null
export type Evidencespan = string | null
export type Explanation = string | null
export type Methodversion = string
export type Model = string
export type Postid = string
export type Stance = 'bullish' | 'bearish' | 'neutral' | 'mixed' | 'uncertain' | 'unclassified'
export type Subject1 = string
/**
 * @maxItems 40
 */
export type Annotations = StanceAnnotation[]
export type Bearish = number
export type Bullish = number
export type Mixed = number
export type Neutral = number
export type Uncertain = number
export type Unclassified = number
export type Evidenceid1 = string
export type Kind9 = 'sentiment'
/**
 * @maxItems 8
 */
export type Limitations8 = string[]
export type Mode1 = 'latest' | 'top'
export type Observedat12 = string
/**
 * @maxItems 40
 */
export type Posts1 = ResearchPostSnapshot[]
export type Query1 = string
/**
 * @maxItems 64
 */
export type Sourceids8 = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids8 = string[]
export type Status10 = 'complete' | 'partial' | 'unavailable'
export type Title9 = string
export type Version9 = 1
export type Chain4 = 'bnb' | 'solana'
export type Confidence1 = 'low' | 'moderate' | 'high'
export type Held = boolean
export type Kind10 = 'trade-analysis'
export type Lean1 = 'buy' | 'hold' | 'sell'
/**
 * @maxItems 8
 */
export type Limitations9 = string[]
export type Marketsession1 = string | null
export type Observedat13 = string
/**
 * @maxItems 5
 */
export type Risks = AnalysisRisk[]
/**
 * @maxItems 5
 */
export type Signals = AnalysisSignal[]
/**
 * @maxItems 64
 */
export type Sourceids9 = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids9 = string[]
export type Status11 = 'complete' | 'partial' | 'unavailable'
export type Symbol2 = string
export type Title10 = string
export type Version10 = 1
export type Amount = string
export type Chain5 = 'bnb' | 'solana'
export type Estimatedamount = string | null
export type Kind11 = 'trade-intent'
/**
 * @maxItems 8
 */
export type Limitations10 = string[]
export type Observedat14 = string
export type Paytoken = string
export type Priceusd1 = string | null
export type Quotedat = string | null
export type Side = 'buy' | 'sell'
/**
 * @maxItems 64
 */
export type Sourceids10 = string[]
/**
 * @maxItems 8
 */
export type Sourcetoolcallids10 = string[]
export type Status12 = 'complete' | 'partial' | 'unavailable'
export type Symbol3 = string
export type Title11 = string
export type Venuelabel1 = string
export type Version11 = 1
export type ResearchCard =
  | SearchResultsCard
  | SentimentCard
  | MarketSnapshotCard
  | MarketsCard
  | PortfolioCard
  | PriceChartCard
  | TradeIntentCard
  | IssuerComparisonCard
  | BackingCard
  | ClaimCheckCard
  | TradeAnalysisCard
export type Kind12 = 'x_post' | 'market_data' | 'issuer_data'
export type ObservedAt = string
export type SourceId = string
export type Title12 = string
export type Url3 = string | null
/**
 * @maxItems 40
 */
export type Citations = Citation[]
export type Createdat = string
/**
 * @maxItems 12
 */
export type Limitations11 = string[]
export type Runid1 = string
export type Schemaversion = 1
export type Status13 = 'pending' | 'complete' | 'cancelled' | 'interrupted' | 'error'
export type From = string
export type Label = string | null
export type To = string
export type Description = string | null
export type Icon = ('user' | 'sparkles' | 'wrench' | 'database' | 'globe' | 'check') | null
export type Id3 = string
export type Label1 = string
export type Variant = ('default' | 'primary' | 'success' | 'warning' | 'danger') | null
export type Description1 = string | null
export type Direction = 'horizontal' | 'vertical'
/**
 * @maxItems 24
 */
export type Edges = FlowEdge[]
/**
 * @minItems 1
 * @maxItems 16
 */
export type Nodes = FlowNode[]
export type Title13 = string
export type Type = 'flow'
export type Version12 = 1

export interface ResearchContract {
  ActivityStep?: ActivityStep
  ActivitySnapshot?: ActivitySnapshot
  ComparisonRow?: ComparisonRow
  PriceReading?: PriceReading
  AnalysisPosition?: AnalysisPosition
  AnalysisRisk?: AnalysisRisk
  AnalysisSignal?: AnalysisSignal
  AnalysisSplit?: AnalysisSplit
  BackingCard?: BackingCard
  Candle?: Candle
  CheckedSource?: CheckedSource
  ClaimCheckCard?: ClaimCheckCard
  IssuerComparisonCard?: IssuerComparisonCard
  MarketSnapshotCard?: MarketSnapshotCard
  MarketVenueRow?: MarketVenueRow
  MarketsCard?: MarketsCard
  ObservationWindow?: ObservationWindow
  PortfolioCard?: PortfolioCard
  PortfolioPositionRow?: PortfolioPositionRow
  PostAuthorSnapshot?: PostAuthorSnapshot
  PostEngagementSnapshot?: PostEngagementSnapshot
  PriceChartCard?: PriceChartCard
  ResearchPostSnapshot?: ResearchPostSnapshot
  SampleCoverage?: SampleCoverage
  SearchResultsCard?: SearchResultsCard
  SentimentCard?: SentimentCard
  StanceAnnotation?: StanceAnnotation
  StanceCounts?: StanceCounts
  Subject?: Subject
  TradeAnalysisCard?: TradeAnalysisCard
  TradeIntentCard?: TradeIntentCard
  ResearchCard?: ResearchCard
  Citation?: Citation
  UIMessageMetadata?: UIMessageMetadata
  FlowEdge?: FlowEdge
  FlowNode?: FlowNode
  VisualizationSpec?: VisualizationSpec
}
/**
 * One thing the runtime actually did.
 *
 * Telemetry, not reasoning. `code` is an allowlisted event name the client
 * maps to a label — the server never ships display strings and the model never
 * writes any of this. A step is keyed by its tool call so a retry updates the
 * row it belongs to instead of appending a second one.
 */
export interface ActivityStep {
  code: Code
  count?: Count
  detail?: Detail
  executionId?: Executionid
  finishedAt?: Finishedat
  id: Id
  startedAt: Startedat
  status: Status
  toolCallId?: Toolcallid
  total?: Total
}
export interface ActivitySnapshot {
  runId: Runid
  status: Status1
  steps: Steps
  version: Version
}
/**
 * One listing in a comparison, with every axis it can differ on.
 *
 * `reference_price` rather than the raw token price, because raw token prices
 * across issuers are not comparable — the multipliers differ per issuer and
 * comparing them directly is the single most available way to be wrong here.
 */
export interface ComparisonRow {
  chain: Chain
  contractAddress?: Contractaddress
  currency: Currency
  multiplier?: Multiplier
  observedAt?: Observedat
  referencePrice?: Referenceprice
  sourceId?: Sourceid
  symbol: Symbol
  tokenPrice?: Tokenprice
  tradable?: Tradable
  unavailableReason?: Unavailablereason
  venue: Venue
  venueLabel: Venuelabel
}
/**
 * A price, what it is a price *of*, and when it was true.
 *
 * `basis` is the field that stops the whole product lying: a token price and
 * the share price it tracks are different quantities, and the multiplier-
 * adjusted reference is a third. Rendering any of them without saying which
 * is how a 0.057% gap that does not exist gets reported.
 */
export interface PriceReading {
  asOf?: Asof
  basis: Basis
  currency: Currency1
  sourceId?: Sourceid1
  value: Value
}
/**
 * What the reader already holds of it, from trades recorded in this panel.
 */
export interface AnalysisPosition {
  quantity: Quantity
  symbol: Symbol1
  unrealizedPnlPercent?: Unrealizedpnlpercent
  weightPercent?: Weightpercent
}
/**
 * Not a direction: something that argues for waiting, at a level.
 */
export interface AnalysisRisk {
  key: Key
  level: Level
  reading: Reading
}
/**
 * One directional reading, from bearish (-1) to bullish (+1).
 *
 * `lean` and `score` are absent together: a signal the data could not feed
 * is shown as not read, with `reading` saying why, and it did not count.
 */
export interface AnalysisSignal {
  key: Key1
  lean?: Lean
  reading: Reading1
  score?: Score
}
export interface AnalysisSplit {
  buy: Buy
  hold: Hold
  sell: Sell
}
export interface BackingCard {
  companyName?: Companyname
  dailyReportUrl?: Dailyreporturl
  fetchedAt?: Fetchedat
  issuerLabel: Issuerlabel
  kind: Kind
  limitations: Limitations
  monthlyReportUrl?: Monthlyreporturl
  observedAt: Observedat1
  reportedAt?: Reportedat
  sourceIds: Sourceids
  sourceToolCallIds: Sourcetoolcallids
  status: Status2
  subject: Subject
  title: Title
  version: Version1
}
/**
 * What a card is about. Never inferred by the renderer.
 */
export interface Subject {
  chain?: Chain1
  companyName?: Companyname1
  ticker: Ticker
  venue?: Venue1
}
export interface Candle {
  close: Close
  high: High
  low: Low
  open: Open
  session?: Session
  time: Time
  volume?: Volume
}
/**
 * One source held against the claim, and what it turned out to say.
 *
 * `kind` is load-bearing. A company filing and a stranger's post are both
 * sources and they are not the same kind of evidence, so the card groups by it
 * and the status below is decided only by the primary ones.
 */
export interface CheckedSource {
  excerpt?: Excerpt
  kind: Kind1
  observedAt: Observedat2
  publishedAt?: Publishedat
  publisher: Publisher
  sourceId?: Sourceid2
  title: Title1
  url?: Url
  verdict: Verdict
}
/**
 * Whether a claim is corroborated by sources that can corroborate it.
 *
 * Three deliberate refusals, each one a way this card could lie:
 *
 * **Silence is not denial.** A source that does not mention the claim is
 * `unaddressed`, and `unverified` is the status when nothing primary speaks to
 * it. Absence of confirmation is not evidence against.
 *
 * **A post does not confirm anything.** People on X repeat each other; ten
 * posts saying the same thing is one rumour with nine echoes. They are listed
 * because the reader asked about something they probably read there, and they
 * are excluded from the status by construction.
 *
 * **`contradicted` needs a source that actually contradicts.** It is never
 * inferred from a failure to match.
 */
export interface ClaimCheckCard {
  claim: Claim
  kind: Kind2
  limitations: Limitations1
  observedAt: Observedat3
  primaryChecked: Primarychecked
  primaryContradicting: Primarycontradicting
  primarySupporting: Primarysupporting
  sourceIds: Sourceids1
  sourceToolCallIds: Sourcetoolcallids1
  sources: Sources
  status: Status3
  subject: Subject
  title: Title2
  verdict: Verdict1
  version: Version2
}
export interface IssuerComparisonCard {
  kind: Kind3
  limitations: Limitations2
  observedAt: Observedat4
  rows: Rows
  sourceIds: Sourceids2
  sourceToolCallIds: Sourcetoolcallids2
  status: Status4
  subject: Subject
  title: Title3
  version: Version3
}
export interface MarketSnapshotCard {
  gapPercent?: Gappercent
  kind: Kind4
  limitations: Limitations3
  marketCap?: Marketcap
  marketSession?: Marketsession
  multiplier?: Multiplier1
  observedAt: Observedat5
  priceChangePct24h?: Pricechangepct24H
  referencePrice?: PriceReading | null
  sharePrice?: PriceReading | null
  sourceIds: Sourceids3
  sourceToolCallIds: Sourcetoolcallids3
  status: Status5
  subject: Subject
  title: Title4
  tokenPrice?: PriceReading | null
  totalSupply?: Totalsupply
  version: Version4
  volume24h?: Volume24H
}
/**
 * One market, from the requested token's side of it.
 */
export interface MarketVenueRow {
  id: Id1
  liquidityUsd?: Liquidityusd
  pair: Pair
  priceUsd?: Priceusd
  url?: Url1
  venue: Venue2
  volume24hUsd?: Volume24Husd
}
/**
 * Where a token actually trades, and what it costs at each venue.
 *
 * Distinct from `MarketSnapshotCard`, which is one price for one token on one
 * issuer. This is the spread across venues: the same token quoted at $150.86
 * on Manifest and $149.35 on Raydium CLMM in the same second. A reader asking
 * "where can I buy this" is asking this question, and the snapshot card cannot
 * answer it.
 *
 * `coverage` is not decoration. Neither market directory states a total, so a
 * full page is evidence there may be more rather than a complete list, and the
 * card must not imply it has enumerated the market.
 */
export interface MarketsCard {
  chain: Chain2
  coverage: Coverage
  fetchedAt?: Fetchedat1
  kind: Kind5
  limitations: Limitations4
  markets: Markets
  observedAt: Observedat6
  priceSpreadPercent?: Pricespreadpercent
  source: Source
  sourceIds: Sourceids4
  sourceToolCallIds: Sourcetoolcallids4
  spreadVenueCount: Spreadvenuecount
  status: Status6
  subject: Subject
  title: Title5
  totalCount: Totalcount
  version: Version5
}
/**
 * What was asked for, and what was actually seen inside it.
 */
export interface ObservationWindow {
  earliestPostAt?: Earliestpostat
  latestPostAt?: Latestpostat
  requestedFrom?: Requestedfrom
  requestedTo?: Requestedto
}
/**
 * What the connected wallets hold, and what it has done.
 *
 * Built only from trades this product recorded, which is the limitation that
 * governs every number on it: a token bought elsewhere and held in the same
 * wallet is invisible here, so this is a record of activity rather than a
 * balance sheet. `pnl_complete` is the server saying whether every sell it
 * matched had a buy to match against.
 */
export interface PortfolioCard {
  costBasis: Costbasis
  kind: Kind6
  limitations: Limitations5
  marketValue?: Marketvalue
  observedAt: Observedat7
  openPositionCount: Openpositioncount
  positions: Positions
  pricedPositionCount: Pricedpositioncount
  realizedPnl: Realizedpnl
  sourceIds: Sourceids5
  sourceToolCallIds: Sourcetoolcallids5
  status: Status7
  subject: Subject
  title: Title6
  totalPnl?: Totalpnl
  tradeCount: Tradecount
  unrealizedPnl?: Unrealizedpnl1
  version: Version6
  walletCount: Walletcount
  winRatePercent?: Winratepercent
}
/**
 * One open position. A token held on two chains is two positions.
 */
export interface PortfolioPositionRow {
  averageEntryPrice?: Averageentryprice
  chain: Chain3
  currentPrice?: Currentprice
  marketValue?: Marketvalue1
  quantity: Quantity1
  ticker: Ticker1
  unrealizedPnl?: Unrealizedpnl
  unrealizedPnlPercent?: Unrealizedpnlpercent1
  venue: Venue3
  weightPercent?: Weightpercent1
}
export interface PostAuthorSnapshot {
  avatarUrl?: Avatarurl
  followers?: Followers
  handle: Handle
  name: Name
  verified: Verified
}
/**
 * What the collector actually observed, at the moment it looked.
 *
 * Every field is optional because X renders these inconsistently and a
 * collector that scrolled past a post without reading its counts has seen
 * nothing, not zero.
 */
export interface PostEngagementSnapshot {
  likes?: Likes
  observedAt?: Observedat8
  replies?: Replies
  reposts?: Reposts
  views?: Views
}
export interface PriceChartCard {
  basis: Basis1
  candles: Candles
  currency: Currency2
  fetchedAt?: Fetchedat2
  interval: Interval
  kind: Kind7
  limitations: Limitations6
  observedAt: Observedat9
  sourceIds: Sourceids6
  sourceToolCallIds: Sourcetoolcallids6
  status: Status8
  subject: Subject
  title: Title7
  version: Version7
}
/**
 * One post, stored well enough to re-render it after a reload.
 *
 * The snapshot carries the post text itself instead of a pointer into a tool
 * result. Nothing in this extension keeps tool outputs on the client, so a
 * pointer would render an empty card the moment the panel reopened. The text
 * travels.
 */
export interface ResearchPostSnapshot {
  author: PostAuthorSnapshot
  engagement?: PostEngagementSnapshot | null
  id: Id2
  observedAt: Observedat10
  publishedAt?: Publishedat1
  quotedPostId?: Quotedpostid
  repostedPostId?: Repostedpostid
  sourceId?: Sourceid3
  text: Text
  truncated: Truncated
  url: Url2
}
/**
 * The denominators, so no percentage on screen is unattributable.
 *
 * `collected` is what the browser saw; `relevant` is what survived relevance;
 * `classified` is what the classifier actually answered for. They are
 * different numbers and a card that shows only the last one is hiding its own
 * sample loss.
 */
export interface SampleCoverage {
  authors: Authors
  classified: Classified
  collected: Collected
  deduplicated: Deduplicated
  relevant: Relevant
}
/**
 * Evidence with no classification yet — what a bare `search_x` produces.
 */
export interface SearchResultsCard {
  evidenceId: Evidenceid
  kind: Kind8
  limitations: Limitations7
  mode: Mode
  observedAt: Observedat11
  posts: Posts
  query: Query
  sample: SampleCoverage
  sourceIds: Sourceids7
  sourceToolCallIds: Sourcetoolcallids7
  status: Status9
  subject: Subject
  title: Title8
  version: Version8
  window: ObservationWindow
}
/**
 * The same evidence, once a stance is attached to each post.
 *
 * Upserted onto the search card's part ID rather than appended beside it: two
 * cards listing the same forty posts is the panel arguing with itself.
 */
export interface SentimentCard {
  annotations: Annotations
  counts: StanceCounts
  evidenceId: Evidenceid1
  kind: Kind9
  limitations: Limitations8
  mode: Mode1
  observedAt: Observedat12
  posts: Posts1
  query: Query1
  sample: SampleCoverage
  sourceIds: Sourceids8
  sourceToolCallIds: Sourcetoolcallids8
  status: Status10
  subject: Subject
  title: Title9
  version: Version9
  window: ObservationWindow
}
/**
 * One classifier answer, attributable.
 *
 * `confidence` is the classifier's own score and is documented as such
 * wherever it is shown. It is not a calibrated probability and must not be
 * presented as one until there is an evaluation that says it is.
 */
export interface StanceAnnotation {
  confidence?: Confidence
  evidenceSpan?: Evidencespan
  explanation?: Explanation
  methodVersion: Methodversion
  model: Model
  postId: Postid
  stance: Stance
  subject: Subject1
}
export interface StanceCounts {
  bearish: Bearish
  bullish: Bullish
  mixed: Mixed
  neutral: Neutral
  uncertain: Uncertain
  unclassified: Unclassified
}
/**
 * The answer to "should I buy, sell or hold?": signals, risks, and a split.
 *
 * The split is computed by `app.research.trade_analysis` from the signals on
 * this card and nothing else. It is the field a reader is most likely to act
 * on and the one a model would most like to write, which is why it is checked
 * here and again on the client: `lean` has to be the largest share, Hold
 * winning a tie, or the card is refused.
 *
 * The disclaimer is not in the payload. It lives in the panel, so no model
 * output can shorten it or leave it off.
 */
export interface TradeAnalysisCard {
  chain: Chain4
  confidence: Confidence1
  held: Held
  kind: Kind10
  lean: Lean1
  limitations: Limitations9
  marketSession?: Marketsession1
  observedAt: Observedat13
  position?: AnalysisPosition | null
  price?: PriceReading | null
  risks: Risks
  signals: Signals
  sourceIds: Sourceids9
  sourceToolCallIds: Sourcetoolcallids9
  split: AnalysisSplit
  status: Status11
  subject: Subject
  symbol: Symbol2
  title: Title10
  version: Version10
}
/**
 * A trade the user asked for, priced at the moment they asked. Never a suggestion.
 *
 * It carries a price and a conversion because that is the question behind
 * "buy $100 of NVDAon" — how much do I get. What it must not do is let that
 * figure be mistaken for the fill: prices move between the model writing this
 * and the user reading it, so the price is stamped with `quotedAt` and the
 * card says it is indicative.
 *
 * Confirm opens the buy screen with the amount prefilled. That screen fetches
 * its own live quote, shows the route and the minimum received, and hands the
 * transaction to the wallet. Nothing here signs anything.
 *
 * That is also what keeps it safe to render from a model that reads untrusted
 * posts: the worst an injected "buy $5000 of X" can do is show a card the user
 * did not ask for, which they decline by not pressing a button.
 */
export interface TradeIntentCard {
  amount: Amount
  chain: Chain5
  estimatedAmount?: Estimatedamount
  kind: Kind11
  limitations: Limitations10
  observedAt: Observedat14
  payToken: Paytoken
  priceUsd?: Priceusd1
  quotedAt?: Quotedat
  side: Side
  sourceIds: Sourceids10
  sourceToolCallIds: Sourcetoolcallids10
  status: Status12
  subject: Subject
  symbol: Symbol3
  title: Title11
  venueLabel: Venuelabel1
  version: Version11
}
/**
 * A source the server resolved, never one the model wrote.
 *
 * Defined here rather than in `schemas.py` so that the UI message — which
 * carries a list of these — can live alongside the card schemas without the
 * two modules importing each other. `schemas.py` re-exports it, so every
 * existing call site is unchanged.
 */
export interface Citation {
  kind: Kind12
  observed_at: ObservedAt
  source_id: SourceId
  title: Title12
  url?: Url3
}
export interface UIMessageMetadata {
  citations: Citations
  createdAt: Createdat
  limitations: Limitations11
  runId: Runid1
  schemaVersion: Schemaversion
  status: Status13
}
export interface FlowEdge {
  from: From
  label?: Label
  to: To
}
export interface FlowNode {
  description?: Description
  icon?: Icon
  id: Id3
  label: Label1
  variant?: Variant
}
/**
 * A graph the model may describe and may not draw.
 *
 * There are no coordinates, no styles, no markup and no URLs in this schema,
 * and `extra="forbid"` is what keeps it that way. Dagre decides where things
 * go on the client; the model decides only what is connected to what. A model
 * that could emit layout could emit anything, and "anything" rendered inside
 * somebody's X tab is not a feature.
 */
export interface VisualizationSpec {
  description?: Description1
  direction: Direction
  edges: Edges
  nodes: Nodes
  title: Title13
  type: Type
  version: Version12
}
