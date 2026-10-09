/** SDK envelope with domain payloads generated from the backend schema. */
import type { UIMessage } from 'ai'
import type * as Contract from './generated/contract.js'

export type {
  ActivitySnapshot,
  ActivityStep,
  AnalysisPosition,
  AnalysisRisk,
  AnalysisSignal,
  AnalysisSplit,
  BackingCard,
  Candle,
  CheckedSource,
  ClaimCheckCard,
  ComparisonRow,
  FlowEdge,
  FlowNode,
  IssuerComparisonCard,
  MarketSnapshotCard,
  MarketsCard,
  MarketVenueRow,
  ObservationWindow,
  PortfolioCard,
  PortfolioPositionRow,
  PostAuthorSnapshot,
  PostEngagementSnapshot,
  PriceChartCard,
  PriceReading,
  ResearchCard,
  ResearchPostSnapshot,
  SampleCoverage,
  SearchResultsCard,
  SentimentCard,
  Stance,
  StanceAnnotation,
  StanceCounts,
  Subject,
  TradeAnalysisCard,
  TradeIntentCard,
  UIMessageMetadata,
  VisualizationSpec,
} from './generated/contract.js'
export type UIMessageCitation = Contract.Citation
export type ResearchCardKind = Contract.ResearchCard['kind']
export type CardStatus = Contract.ResearchCard['status']
export type CardBase = Pick<
  Contract.SearchResultsCard,
  | 'version'
  | 'title'
  | 'sourceToolCallIds'
  | 'sourceIds'
  | 'subject'
  | 'observedAt'
  | 'status'
  | 'limitations'
>
export type FlowIcon = NonNullable<Contract.FlowNode['icon']>
export type FlowVariant = NonNullable<Contract.FlowNode['variant']>
export type ActivityStepStatus = Contract.ActivityStep['status']
export const STANCES: readonly Contract.Stance[] = [
  'bullish',
  'bearish',
  'neutral',
  'mixed',
  'uncertain',
  'unclassified',
]
export type ResearchUIMessage = UIMessage<
  Contract.UIMessageMetadata,
  {
    'research-card': Contract.ResearchCard
    visualization: Contract.VisualizationSpec
    activity: Contract.ActivitySnapshot
  }
>
export type UIPart = ResearchUIMessage['parts'][number]
