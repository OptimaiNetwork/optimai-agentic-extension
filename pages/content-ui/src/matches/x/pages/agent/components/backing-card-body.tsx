import type { BackingCard } from '@extension/shared'
import { isSafeHttpUrl } from '@extension/shared'
import { Building2, Check, ExternalLink, FileText, Info } from 'lucide-react'

import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'

import {
  CardFooter,
  CardToken,
  Chip,
  IconPlate,
  SectionLabel,
  day,
  listingFor,
  parse,
} from './card-kit'

/**
 * Links to what the issuer publishes about the shares behind a token.
 *
 * Every word here is attributed. This card does not say the shares exist; it
 * says who claims they do, points at the documents making the claim, and dates
 * them. The illustration draws the claim (a token holding shares) and the
 * footer says plainly that this panel links the reports and does not audit
 * them. A heading like "Verified backing" would be the panel vouching for a
 * custody arrangement it has not inspected.
 *
 * Report URLs come from an upstream API and go through the same `isSafeHttpUrl`
 * gate as any other external link.
 */

const Certificate = ({ ticker, index }: { ticker: string; index: number }) => (
  <div
    className="card-rise absolute box-border flex h-16 w-24 flex-col gap-[5px] rounded-lg px-2.5 py-[9px] shadow-[inset_0_0_0_1px_#3d3d3d]"
    style={{
      left: index * 7,
      top: 16 - index * 8,
      background: index < 2 ? '#2f2f2f' : '#343434',
      animationDelay: `${0.2 + index * 0.15}s`,
    }}>
    <span className="flex items-center gap-[5px] text-[9px] font-semibold text-[#c4c4c4]">
      <Building2 aria-hidden className="size-2.5" strokeWidth={2} />
      {`${ticker} share`}
    </span>
    <span className="h-[3px] w-[60px] rounded-sm bg-[#444444]" />
    <span className="h-[3px] w-11 rounded-sm bg-[#444444]" />
    <span className="h-[3px] w-[52px] rounded-sm bg-[#444444]" />
  </div>
)

const Illustration = ({
  card,
  ticker,
  symbol,
  multiplier,
}: {
  card: BackingCard
  ticker: string
  symbol: string
  multiplier: number | null
}) => (
  <div
    aria-hidden
    className="relative mx-3.5 mt-3 flex h-[132px] items-center justify-center gap-[18px] overflow-hidden rounded-xl border border-[#323232]"
    style={{
      background:
        'radial-gradient(120% 90% at 50% 0%, rgba(94,237,135,0.07), rgba(0,0,0,0) 60%), #242424',
    }}>
    <svg
      width="180"
      height="132"
      viewBox="0 0 180 132"
      className="absolute left-1/2 top-0 -ml-[90px]">
      <path
        d="M90 16 128 30v28c0 26-20 42-38 50-18-8-38-24-38-50V30z"
        fill="none"
        stroke="rgba(94,237,135,0.12)"
        strokeWidth="1.5"
      />
    </svg>
    <div className="relative flex flex-col items-center gap-1.5">
      <span className="card-bob flex">
        <CardToken ticker={ticker} venueKey={card.subject.venue} size={44} />
      </span>
      <span className="text-[10px] text-[#9a9a9a]">{`1 ${symbol}`}</span>
    </div>
    <div className="relative flex flex-col items-center gap-1">
      <svg width="64" height="12" viewBox="0 0 64 12">
        <path
          d="M2 6 H62"
          className="card-flow"
          fill="none"
          stroke="#5eed87"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] font-semibold text-[#5eed87]">holds</span>
    </div>
    <div className="relative flex flex-col items-center gap-1.5">
      <div className="relative h-20 w-[110px]">
        {[0, 1, 2].map((index) => (
          <Certificate key={index} ticker={ticker} index={index} />
        ))}
      </div>
      <span className="text-[10px] text-[#9a9a9a]">
        {multiplier !== null && (
          <span className="tabular-nums text-[#c4c4c4]">{`${multiplier.toFixed(4)} `}</span>
        )}
        {`${ticker} shares`}
      </span>
    </div>
  </div>
)

const Report = ({
  label,
  url,
  published,
}: {
  label: string
  url?: string | null
  published: string
}) => {
  if (!isSafeHttpUrl(url)) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-[10px] border border-[#323232] bg-[#242424] px-3 py-2.5 text-[#ececec] no-underline transition-colors hover:border-[#3d3d3d] hover:bg-[#2a2a2a]">
      <span className="flex size-7 items-center justify-center rounded-lg bg-[#303030]">
        <FileText aria-hidden className="size-3.5 text-[#c4c4c4]" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-13 font-semibold">{label}</span>
        <span className="text-11 truncate text-[#9a9a9a]">{published}</span>
      </span>
      <ExternalLink aria-hidden className="size-3.5 shrink-0 text-[#9a9a9a]" strokeWidth={1.75} />
    </a>
  )
}

export const hasBackingReport = (card: BackingCard): boolean =>
  isSafeHttpUrl(card.dailyReportUrl) || isSafeHttpUrl(card.monthlyReportUrl)

export const BackingChip = ({ card }: { card: BackingCard }) =>
  hasBackingReport(card) ? (
    <Chip tone="green" icon={<Check aria-hidden className="size-[11px]" strokeWidth={2.6} />}>
      Reports on file
    </Chip>
  ) : (
    <Chip>No reports</Chip>
  )

/** The token's own symbol (NVDAon), from the same lookup its logo uses. */
export const useTokenFacts = (ticker: string, venue?: string | null) => {
  const resolved = useResolveCashtag(ticker, { selection: listingFor(venue) })
  return {
    symbol: resolved.data?.symbol ?? ticker,
    multiplier: parse(resolved.data?.multiplier),
  }
}

export const BackingCardBody = ({ card }: { card: BackingCard }) => {
  const ticker = card.subject.ticker.replace(/^\$/, '').toUpperCase()
  const { symbol, multiplier } = useTokenFacts(ticker, card.subject.venue)
  const reported = day(card.reportedAt)
  const published = `Published by ${card.issuerLabel}${reported ? ` · ${reported}` : ''}`

  return (
    <>
      <Illustration card={card} ticker={ticker} symbol={symbol} multiplier={multiplier} />
      <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-3">
        <SectionLabel>Issuer reports</SectionLabel>
        {hasBackingReport(card) ? (
          <>
            <Report label="Daily holdings report" url={card.dailyReportUrl} published={published} />
            <Report
              label="Monthly attestation"
              url={card.monthlyReportUrl}
              published={`Published by ${card.issuerLabel}`}
            />
          </>
        ) : (
          <div className="text-12 flex items-center gap-2.5 rounded-[10px] border border-dashed border-[#3d3d3d] px-3 py-2.5 leading-4 text-[#9a9a9a]">
            <FileText aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            {card.issuerLabel} publishes no attestation report for this token.
          </div>
        )}
        {card.companyName && (
          <>
            <div className="h-1" />
            <SectionLabel>The company</SectionLabel>
            <div className="flex items-start gap-2.5 rounded-[10px] border border-dashed border-[#3d3d3d] p-3">
              <IconPlate>
                <Building2 strokeWidth={1.75} />
              </IconPlate>
              <div className="flex min-w-0 flex-col gap-[3px]">
                <span className="text-13 font-semibold">{card.companyName}</span>
                <span className="text-11 text-[#9a9a9a]">
                  The company whose {ticker} shares back each token
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export const BackingFooter = () => (
  <CardFooter icon={<Info strokeWidth={1.75} />}>
    The issuer publishes these reports. This panel links them, it does not audit them.
  </CardFooter>
)
