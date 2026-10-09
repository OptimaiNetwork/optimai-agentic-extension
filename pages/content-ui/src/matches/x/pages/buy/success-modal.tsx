import { Button } from '@extension/ui'
import { TokenLogo } from '@x/pages/home/token-logo'
import type { StockToken, TradeSide } from '@x/services/catalyst'
import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'

import { ROUTE_LABEL, RouteMark, type RouteId } from './route-marks'

/**
 * The success mark: a tick that lands, and paper that leaves.
 *
 * Four earlier attempts are recorded here as dead ends, because each was wrong
 * differently. Eight straight rays — the sunburst every template ships with. A
 * guilloche rosette around the token's own logo, better drawn, but a picture
 * of *the thing bought* rather than a statement that anything worked. A ring
 * closing around a check — correct, and also what Stripe, Apple and every
 * component library hand you. A price line whose rally doubled as the tick —
 * the cleverest of them, and too quiet to read as a celebration.
 *
 * So: the celebration, built rather than gestured at. The disc arrives with a
 * real overshoot, the tick draws inside it, and twenty-four pieces of paper
 * leave on twenty-four different arcs — each with its own angle, distance,
 * fall, spin rate and moment of disappearing. Confetti reads as cheap when
 * every piece does the same thing at the same time; the whole trick is that
 * none of them do.
 *
 * Every value is computed once at module scope from a seeded generator, so the
 * burst is identical on every render and in every screenshot, and costs nothing
 * per mount. `CONFETTI` below is the entire drawing.
 *
 * Animated with SMIL rather than CSS keyframes: the panel is Chromium-only,
 * every step is geometry, and twenty-four independently-timed pieces would
 * otherwise be twenty-four keyframe blocks in a Tailwind config the rest of the
 * extension shares. `animateMotion` along a quadratic gives each piece its arc
 * and its fall in one attribute.
 */

/** Deterministic, so the burst is the same every time somebody sees it. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

const PIECE_COLOURS = ['#2ECC71', '#8CF0B7', '#FFFFFF', '#1EA55A']

const CONFETTI = (() => {
  const random = seeded(20260921)
  return Array.from({ length: 24 }, (_, index) => {
    // Fanned rather than evenly spaced: an even ring reads as a diagram.
    const angle = ((index + random() * 0.8) / 24) * Math.PI * 2
    const distance = 48 + random() * 30
    const fall = 18 + random() * 30
    const isBar = random() > 0.35
    return {
      // Out along the angle, then down — the control point sits short of the
      // end and slightly high, which is what bends the flight into an arc.
      path:
        `M0,0 Q${(Math.cos(angle) * distance * 0.55).toFixed(1)},` +
        `${(Math.sin(angle) * distance * 0.55 - 8).toFixed(1)} ` +
        `${(Math.cos(angle) * distance).toFixed(1)},` +
        `${(Math.sin(angle) * distance + fall).toFixed(1)}`,
      spin: Math.round((random() > 0.5 ? 1 : -1) * (200 + random() * 340)),
      colour: PIECE_COLOURS[index % PIECE_COLOURS.length],
      width: isBar ? 3.6 : 4.8,
      height: isBar ? 7.4 : 4.8,
      radius: isBar ? 1 : 2.4,
      duration: (0.95 + random() * 0.5).toFixed(2),
      delay: (0.18 + random() * 0.12).toFixed(2),
    }
  })
})()

/** `M-10,0 L-3,8 L11,-8` — 10.6 units down-right, then 21.3 up-right. */
const TICK_LENGTH = 33

const SuccessMark = () => (
  // The viewBox is taller than the burst is wide because SVG clips to its
  // viewport: the pieces fall as well as fly, and a box sized to the fan alone
  // cuts their last third off.
  <svg
    viewBox="0 0 160 148"
    aria-hidden="true"
    // Pulled up by the distance from the SVG's top edge to the top of the disc,
    // so the disc lands inside the 78px box its parent reserves.
    className="pointer-events-none absolute left-0 top-[-26px] h-[168px] w-full">
    <g transform="translate(80,58)">
      {CONFETTI.map((piece) => (
        <g key={piece.path + piece.spin}>
          <animateMotion
            path={piece.path}
            dur={`${piece.duration}s`}
            begin={`${piece.delay}s`}
            calcMode="spline"
            keySplines="0.12 0.62 0.3 1"
            keyTimes="0;1"
            fill="freeze"
          />
          <rect
            x={-piece.width / 2}
            y={-piece.height / 2}
            width={piece.width}
            height={piece.height}
            rx={piece.radius}
            fill={piece.colour}
            opacity={0}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to={piece.spin}
              dur={`${piece.duration}s`}
              begin={`${piece.delay}s`}
              fill="freeze"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.06;0.62;1"
              dur={`${piece.duration}s`}
              begin={`${piece.delay}s`}
              fill="freeze"
            />
          </rect>
        </g>
      ))}

      {/* The disc, arriving. 1.16 then back past 1 — an overshoot that does not
          settle looks like a bug, and one that settles instantly is not an
          overshoot. */}
      <g>
        <animateTransform
          attributeName="transform"
          type="scale"
          values="0;1.16;0.96;1"
          keyTimes="0;0.5;0.78;1"
          dur="0.52s"
          calcMode="spline"
          keySplines="0.34 1.2 0.5 1;0.4 0 0.6 1;0.4 0 0.2 1"
          fill="freeze"
        />
        <circle r={27} className="fill-primary" />
        <path
          d="M-10,0 L-3,8 L11,-8"
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="#001A0C"
          strokeDasharray={TICK_LENGTH}
          strokeDashoffset={TICK_LENGTH}>
          <animate
            attributeName="stroke-dashoffset"
            from={TICK_LENGTH}
            to={0}
            dur="0.3s"
            begin="0.3s"
            calcMode="spline"
            keySplines="0.16 1 0.3 1"
            keyTimes="0;1"
            fill="freeze"
          />
        </path>
      </g>
    </g>
  </svg>
)

/** `4vJ9JU…nature` — both ends kept, because both ends get checked. */
const middleTruncate = (value: string, lead = 6, tail = 6): string =>
  value.length <= lead + tail + 1 ? value : `${value.slice(0, lead)}…${value.slice(-tail)}`

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <span className="text-12 text-muted-foreground">{label}</span>
    <span className="text-12 text-foreground max-w-[62%] truncate text-right tabular-nums">
      {children}
    </span>
  </div>
)

/**
 * What a completed purchase looks like.
 *
 * It was one bordered line — "Transaction sent · view on Solscan" — tucked under
 * the quote it had just replaced, at the same weight as the routing note above
 * it. The single most significant thing that happens on this panel, styled as a
 * footnote, and nothing on screen said what had actually been bought.
 *
 * Covers the buy screen rather than replacing it, because the numbers behind it
 * are the numbers it is describing and dismissing should not feel like
 * navigating.
 */
export const SuccessModal = ({
  token,
  side = 'buy',
  symbol,
  received,
  paid,
  payToken,
  route,
  explorerUrl,
  explorerName,
  hash,
  extra,
  onDone,
  onBuyMore,
}: {
  token?: StockToken
  /** A sale reads the other way round: settlement received, stock token paid. */
  side?: TradeSide
  symbol: string
  /** Stock token on a buy, settlement token on a sell. */
  received: string
  /** Settlement token on a buy, stock token on a sell. */
  paid: string
  payToken: string
  route: RouteId
  chain: 'bnb' | 'solana'
  explorerUrl: string
  explorerName: string
  /** The signature or transaction hash, shown truncated beside the link. */
  hash: string
  /** The chain-specific afterthought — on BNB, adding the token to MetaMask. */
  extra?: ReactNode
  onDone: () => void
  onBuyMore: () => void
}) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={side === 'sell' ? `Sold ${symbol}` : `Bought ${symbol}`}
    className="bg-brown/80 absolute inset-0 z-50 flex flex-col justify-end backdrop-blur-sm">
    <div className="rounded-t-24 animate-slideUpAndFade border-t border-white/10 bg-[#1b1b1b] p-5 shadow-2xl">
      {/* The mark is 168px tall and the disc sits in the top third of it — the
          rest is the room the confetti needs to fall through. Laid out in flow
          that dead space became a hole between the tick and the words under it,
          so the mark is lifted out of flow: the box below reserves the disc's
          height and nothing else, and the paper falls across the text, which is
          where falling paper belongs. */}
      <div className="relative h-[78px]">
        <SuccessMark />
      </div>

      <div className="mt-3 flex flex-col items-center">
        <p className="text-11 text-muted-foreground font-medium uppercase tracking-[0.08em]">
          {side === 'sell' ? 'Sale complete' : 'Purchase complete'}
        </p>
        <p className="text-26 text-foreground mt-1 flex items-center gap-2 font-medium tabular-nums leading-none">
          {received}
          <span className="text-muted-foreground text-16 flex items-center gap-1.5">
            {side === 'buy' && token && <TokenLogo token={token} className="size-5" />}
            {side === 'sell' ? payToken : symbol}
          </span>
        </p>
      </div>

      <div className="rounded-10 mt-5 bg-white/[0.04] px-3 py-2">
        <Fact label={side === 'sell' ? 'You sold' : 'You paid'}>
          {side === 'sell' ? (
            <span className="inline-flex items-center gap-1.5 align-middle">
              {paid}
              {token && <TokenLogo token={token} className="size-4" />}
              {symbol}
            </span>
          ) : (
            `${paid} ${payToken}`
          )}
        </Fact>
        <Fact label="Route">
          <span className="inline-flex items-center gap-1.5 align-middle">
            <RouteMark route={route} className="size-3.5" />
            {ROUTE_LABEL[route]}
          </span>
        </Fact>
        <div className="border-white/8 mt-1 border-t pt-1">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-12 text-primary flex items-center justify-between gap-3 py-1.5 hover:opacity-80">
            <span className="shrink-0">View on {explorerName}</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate tabular-nums">{middleTruncate(hash)}</span>
              <ExternalLink className="size-3.5 shrink-0" />
            </span>
          </a>
        </div>
      </div>

      {extra && <div className="mt-3">{extra}</div>}

      <div className="mt-5 flex gap-2">
        <Button
          variant="outline"
          size="lg"
          className="rounded-16 text-14 h-12 flex-1 font-medium"
          onClick={onBuyMore}>
          {side === 'sell' ? 'Sell more' : 'Buy more'}
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="rounded-16 text-14 h-12 flex-1 font-semibold"
          onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  </div>
)
