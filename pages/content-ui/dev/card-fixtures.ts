/**
 * One card of every kind, carrying the sample figures drawn on the card design
 * canvas ("Agent research cards"), so the gallery can be laid beside it and
 * compared frame for frame. Harness only: nothing here ships.
 */
import type { ResearchCard, ResearchPostSnapshot, VisualizationSpec } from '@extension/shared'

const HOUR = 3_600_000
const now = new Date()
const stamp = (offsetMs = 0) => new Date(now.getTime() + offsetMs).toISOString()
const at = (hours: number, minutes: number) => {
  const date = new Date(now)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

const base = (title: string, ticker: string, venue?: string) => ({
  version: 1 as const,
  title,
  sourceToolCallIds: ['fixture'],
  sourceIds: ['m_1'],
  observedAt: at(14, 31),
  status: 'complete' as const,
  limitations: [],
  subject: { ticker, venue: venue ?? null, companyName: null, chain: null },
})

const price = (value: string, basis: 'token' | 'share' | 'reference') => ({
  value,
  basis,
  currency: 'USD',
})

export const marketSnapshot = {
  ...base('NVDA on Ondo · Solana', 'NVDA', 'ondo_solana'),
  subject: { ticker: 'NVDA', venue: 'ondo_solana', companyName: 'NVIDIA', chain: null },
  kind: 'market-snapshot',
  tokenPrice: price('214.17', 'token'),
  referencePrice: price('213.80', 'reference'),
  sharePrice: price('222.47', 'share'),
  multiplier: '1.0017',
  gapPercent: '-3.90',
  marketCap: '3810000',
  priceChangePct24h: '-2.18',
  marketSession: 'pre_market',
} as unknown as ResearchCard

export const issuerComparison = {
  ...base('NVDA across issuers', 'NVDA', 'ondo_solana'),
  kind: 'issuer-comparison',
  rows: [
    {
      venue: 'ondo_solana',
      venueLabel: 'Ondo · Solana',
      chain: 'solana',
      symbol: 'NVDAon',
      currency: 'USD',
      referencePrice: '213.80',
      multiplier: '1.0017',
      tradable: true,
    },
    {
      venue: 'bstock',
      venueLabel: 'bStocks · BNB Chain',
      chain: 'bnb',
      symbol: 'NVDAB',
      currency: 'USD',
      referencePrice: '222.58',
      multiplier: '1.0008',
      tradable: false,
    },
    {
      venue: 'ondo_bnb',
      venueLabel: 'Ondo · BNB Chain',
      chain: 'bnb',
      symbol: 'NVDAon',
      currency: 'USD',
      referencePrice: '222.61',
      multiplier: '1.0017',
      tradable: false,
    },
    {
      venue: 'prestock',
      venueLabel: 'PreStocks · Solana',
      chain: 'solana',
      symbol: 'NVDA',
      currency: 'USD',
      unavailableReason: 'Lists pre IPO names only',
    },
  ],
} as unknown as ResearchCard

const CLOSES = [
  381.2, 383.9, 386.66, 384.1, 380.8, 378.9, 377.4, 377.9, 378.2, 377.6, 377.8, 378.0, 377.7, 377.9,
  378.1, 377.8, 375.31, 379.6, 384.2, 389.8, 394.5, 398.2, 400.9, 402.54,
]
const hourStart = new Date(now)
hourStart.setMinutes(0, 0, 0)

export const priceChart = {
  ...base('TSLA · 1h on Ondo · Solana', 'TSLA', 'ondo_solana'),
  kind: 'price-chart',
  basis: 'token',
  currency: 'USD',
  interval: '1h',
  candles: CLOSES.map((close, index) => ({
    time: new Date(hourStart.getTime() - (CLOSES.length - 1 - index) * HOUR).toISOString(),
    open: String(close),
    high: String(close),
    low: String(close),
    close: String(close),
    session: index >= 7 && index <= 15 ? 'closed' : 'regular',
  })),
} as unknown as ResearchCard

export const markets = {
  ...base('TSLA markets on bStocks', 'TSLA', 'bstock'),
  kind: 'markets',
  chain: 'bnb',
  source: 'geckoterminal',
  coverage: 'complete',
  totalCount: 3,
  spreadVenueCount: 3,
  priceSpreadPercent: '0.32',
  markets: [
    {
      id: 'p1',
      venue: 'PancakeSwap v3',
      pair: 'TSLAB / USDT',
      priceUsd: '375.90',
      liquidityUsd: '412800',
      volume24hUsd: '96400',
      url: 'https://www.geckoterminal.com/bsc/pools/p1',
    },
    {
      id: 'p2',
      venue: 'PancakeSwap v2',
      pair: 'TSLAB / USDT',
      priceUsd: '376.40',
      liquidityUsd: '88100',
      volume24hUsd: '12700',
      url: 'https://www.geckoterminal.com/bsc/pools/p2',
    },
    {
      id: 'p3',
      venue: 'THENA',
      pair: 'TSLAB / USDT',
      priceUsd: '377.10',
      liquidityUsd: '21400',
      volume24hUsd: '3200',
      url: 'https://www.geckoterminal.com/bsc/pools/p3',
    },
  ],
} as unknown as ResearchCard

export const tradeIntent = {
  ...base('Buy NVDAon', 'NVDA', 'ondo_solana'),
  kind: 'trade-intent',
  side: 'buy',
  symbol: 'NVDAon',
  chain: 'solana',
  venueLabel: 'Ondo · Solana',
  amount: '20',
  payToken: 'USDC',
  priceUsd: '214.17',
  estimatedAmount: '0.093385',
} as unknown as ResearchCard

export const portfolio = {
  ...base('Your positions', 'PORTFOLIO'),
  kind: 'portfolio',
  walletCount: 2,
  realizedPnl: '8.40',
  unrealizedPnl: '24.12',
  totalPnl: '32.52',
  costBasis: '404.00',
  marketValue: '428.12',
  winRatePercent: '100',
  tradeCount: 5,
  openPositionCount: 2,
  pricedPositionCount: 2,
  positions: [
    {
      ticker: 'NVDA',
      chain: 'bnb',
      venue: 'bstock',
      quantity: '1.2',
      averageEntryPrice: '210.00',
      currentPrice: '222.58',
      marketValue: '267.10',
      unrealizedPnl: '15.10',
      unrealizedPnlPercent: '5.99',
      weightPercent: '62.4',
    },
    {
      ticker: 'TSLA',
      chain: 'solana',
      venue: 'ondo_solana',
      quantity: '0.4',
      averageEntryPrice: '380.00',
      currentPrice: '402.54',
      marketValue: '161.02',
      unrealizedPnl: '9.02',
      unrealizedPnlPercent: '5.93',
      weightPercent: '37.6',
    },
  ],
} as unknown as ResearchCard

export const backing = {
  ...base('NVDA backing · Ondo · Solana', 'NVDA', 'ondo_solana'),
  kind: 'backing',
  issuerLabel: 'Ondo',
  companyName: 'NVIDIA Corporation',
  dailyReportUrl: 'https://ondo.finance/reports/daily',
  monthlyReportUrl: 'https://ondo.finance/reports/monthly',
  reportedAt: '2026-09-21T00:00:00Z',
} as unknown as ResearchCard

const post = (
  id: string,
  name: string,
  handle: string,
  hoursAgo: number,
  text: string
): ResearchPostSnapshot =>
  ({
    id,
    url: `https://x.com/${handle}/status/${id}`,
    author: { handle, name, verified: false },
    text,
    observedAt: stamp(),
    publishedAt: stamp(-hoursAgo * HOUR),
    truncated: false,
  }) as ResearchPostSnapshot

const LEAD_POSTS = [
  post(
    '9001',
    'Chainwatch',
    'chainwatch',
    4,
    'Tokenized $TSLA on BSC is now deeper than it was all quarter. Spread is finally tight enough to matter.'
  ),
  post(
    '9002',
    'Macro Daily',
    'macro_daily',
    6,
    'Watching $TSLA into the delivery numbers. Onchain it already moved while Nasdaq slept.'
  ),
  post(
    '9003',
    'desk notes',
    'deskn0tes',
    9,
    'Every tokenized $TSLA venue quotes a different number tonight. Check the multiplier before you compare.'
  ),
]
const MORE_POSTS = Array.from({ length: 15 }, (_, index) =>
  post(
    `91${index}`,
    `Reader ${index + 1}`,
    `reader_${index + 1}`,
    10 + index,
    `Sample post ${index + 1} about $TSLA for the gallery.`
  )
)
const POSTS = [...LEAD_POSTS, ...MORE_POSTS]

const xCard = {
  ...base('TSLA on X', 'TSLA'),
  evidenceId: 'ev_1',
  query: 'tokenized $TSLA',
  mode: 'latest',
  window: { earliestPostAt: stamp(-24 * HOUR), latestPostAt: stamp() },
  sample: { collected: 20, deduplicated: 20, relevant: 18, classified: 18, authors: 12 },
  posts: POSTS,
}

export const searchResults = { ...xCard, kind: 'search-results' } as unknown as ResearchCard

export const sentiment = {
  ...xCard,
  kind: 'sentiment',
  counts: { bullish: 8, neutral: 4, bearish: 3, mixed: 2, uncertain: 1, unclassified: 0 },
  annotations: [
    { postId: '9001', stance: 'bullish', subject: 'TSLA', model: 'fixture', methodVersion: '1' },
    { postId: '9002', stance: 'bullish', subject: 'TSLA', model: 'fixture', methodVersion: '1' },
    { postId: '9003', stance: 'neutral', subject: 'TSLA', model: 'fixture', methodVersion: '1' },
  ],
} as unknown as ResearchCard

const source = (title: string, publisher: string, kind: string) => ({
  title,
  publisher,
  kind,
  verdict: 'unaddressed',
  observedAt: stamp(),
  publishedAt: '2026-08-27T20:00:00Z',
})

export const claimCheck = {
  ...base('Claim check', 'NVDA'),
  kind: 'claim-check',
  claim: 'NVIDIA officially announced a stock split this year.',
  verdict: 'unverified',
  primaryChecked: 8,
  primarySupporting: 0,
  primaryContradicting: 0,
  sources: [
    source('Quarterly report, Form 10-Q', 'SEC EDGAR', 'sec_filing'),
    source('Current report, Form 8-K', 'SEC EDGAR', 'sec_filing'),
    source('Second quarter results', 'NVIDIA newsroom', 'company_announcement'),
    source('Annual report, Form 10-K', 'SEC EDGAR', 'sec_filing'),
  ],
} as unknown as ResearchCard

export const flow: VisualizationSpec = {
  version: 1,
  type: 'flow',
  title: 'How a bStocks buy settles',
  description: 'From your wallet to the token',
  direction: 'vertical',
  nodes: [
    {
      id: 'wallet',
      label: 'Your wallet',
      description: 'USDT on BNB Chain',
      icon: 'user',
      variant: 'default',
    },
    {
      id: 'pool',
      label: 'PancakeSwap pool',
      description: 'Swaps USDT for NVDAB at the pool price',
      icon: 'database',
      variant: 'warning',
    },
    {
      id: 'token',
      label: 'NVDAB in your wallet',
      description: 'Arrives after one confirmation',
      icon: 'check',
      variant: 'success',
    },
  ],
  edges: [
    { from: 'wallet', to: 'pool' },
    { from: 'pool', to: 'token' },
  ],
} as unknown as VisualizationSpec

const signal = (key: string, reading: string, lean: string | null, score: string | null) => ({
  key,
  reading,
  lean,
  score,
})

export const tradeAnalysis = {
  ...base('NVDA trade analysis', 'NVDA', 'bstock'),
  subject: { ticker: 'NVDA', venue: 'bstock', companyName: 'NVIDIA', chain: null },
  observedAt: at(14, 32),
  sourceIds: ['m_1', 'm_2', 'i_1', 'x_1', 'x_2', 'x_3'],
  kind: 'trade-analysis',
  symbol: 'NVDAB',
  chain: 'bnb',
  price: price('222.90', 'reference'),
  marketSession: 'premarket',
  split: { buy: 48, hold: 41, sell: 11 },
  lean: 'buy',
  confidence: 'moderate',
  held: false,
  position: null,
  signals: [
    signal('trend', 'Up 6.2% in 30 days, 2.4% above its 50 day average', 'bullish', '0.44'),
    signal('growth', 'Revenue up 106% on the year, quarter to Jul 26', 'bullish', '0.80'),
    signal('sentiment', '11 of 18 posts about NVDA lean bullish', 'bullish', '0.56'),
    signal('valuation', 'P/E 28.5, a premium to the broad market', 'neutral', '-0.15'),
    signal('momentum', 'RSI 58, neither stretched nor washed out', 'neutral', '-0.13'),
  ],
  risks: [
    { key: 'volatility', reading: 'Moves about 2.6% a day', level: 'medium' },
    { key: 'liquidity', reading: '$3.0M traded on chain in 24h', level: 'low' },
    { key: 'premium', reading: 'Token 0.08% above the share', level: 'low' },
    { key: 'session', reading: 'Nasdaq in premarket, thinner until the open', level: 'low' },
  ],
} as unknown as ResearchCard

export const tradeAnalysisHeld = {
  ...base('TSLA trade analysis', 'TSLA', 'ondo_solana'),
  subject: { ticker: 'TSLA', venue: 'ondo_solana', companyName: 'Tesla', chain: null },
  observedAt: at(21, 5),
  sourceIds: ['m_1', 'm_2', 'i_1', 'm_3', 'm_4'],
  status: 'partial',
  limitations: ['Not read: sentiment (No X search this turn).'],
  kind: 'trade-analysis',
  symbol: 'TSLAon',
  chain: 'solana',
  price: price('398.20', 'reference'),
  marketSession: 'closed',
  split: { buy: 9, hold: 38, sell: 53 },
  lean: 'sell',
  confidence: 'low',
  held: true,
  position: {
    symbol: 'TSLAon',
    quantity: '0.4512',
    unrealizedPnlPercent: '34.20',
    weightPercent: '46.00',
  },
  signals: [
    signal('trend', 'Down 9.8% in 30 days, 6.1% below its 50 day average', 'bearish', '-0.72'),
    signal('growth', 'Revenue up 0.5% on the year, quarter to Jun 30', 'neutral', '0.10'),
    signal('valuation', 'P/E 142, priced for a lot of growth', 'bearish', '-0.70'),
    signal('momentum', 'RSI 31, close to washed out', 'bullish', '0.76'),
    signal('sentiment', 'No X search this turn', null, null),
  ],
  risks: [
    { key: 'concentration', reading: '46% of your recorded book', level: 'high' },
    { key: 'volatility', reading: 'Moves about 4.1% a day', level: 'high' },
    { key: 'liquidity', reading: '$84.0K traded on chain in 24h', level: 'medium' },
    { key: 'session', reading: 'Nasdaq closed, can reprice at the open', level: 'medium' },
  ],
} as unknown as ResearchCard

export const GALLERY: Array<{
  id: string
  title: string
  card?: ResearchCard
  flow?: VisualizationSpec
}> = [
  { id: 'MarketSnapshot', title: 'Market snapshot', card: marketSnapshot },
  { id: 'IssuerComparison', title: 'Issuer comparison', card: issuerComparison },
  { id: 'PriceChart', title: 'Price chart', card: priceChart },
  { id: 'Markets', title: 'Markets', card: markets },
  { id: 'TradeIntent', title: 'Trade intent', card: tradeIntent },
  { id: 'Portfolio', title: 'Portfolio', card: portfolio },
  { id: 'Backing', title: 'Backing', card: backing },
  { id: 'SearchResults', title: 'Search results', card: searchResults },
  { id: 'Sentiment', title: 'Sentiment', card: sentiment },
  { id: 'ClaimCheck', title: 'Claim check', card: claimCheck },
  { id: 'Flow', title: 'Flow diagram', flow },
  { id: 'TradeAnalysis', title: 'Trade analysis', card: tradeAnalysis },
  { id: 'TradeAnalysisHeld', title: 'Trade analysis, holding', card: tradeAnalysisHeld },
]
