import type { VenueId } from '@extension/shared'
import type { SVGProps } from 'react'

/**
 * Each issuer's own mark, inlined.
 *
 * The three used to be letters in coloured discs — `B`, `O`, `P` — which read as
 * a placeholder rather than as the issuer. These are the real marks, taken from
 * each issuer's own favicon and run through svgo:
 *
 * - bStocks  https://bin.bnbstatic.com/static/bstocks-ui/favicon.svg
 * - Ondo     https://ondo.finance/icon.svg
 * - PreStocks https://prestocks.com/icon.svg
 *
 * Inlined rather than fetched or imported as assets: a content script has no
 * business making a network call to draw a 16px icon, and the panel's build
 * pipeline has no SVG loader. Each mark is drawn in `currentColor` so the
 * colour lives in one place — `MARK_COLOUR` below — instead of in the path data.
 *
 * PreStocks' own icon sits on a white rounded square; that plate is dropped and
 * the viewBox cropped to the mark, so all three read as marks of one family
 * against the panel rather than one of them carrying a light plate.
 */

type MarkProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'>

const BStocksMark = (props: MarkProps) => (
  <svg viewBox="0 0 96 96" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M48 31.03 64.97 48 48 64.97 31.03 48z" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M48 0a48 48 0 1 1 0 96 48 48 0 0 1 0-96m0 12a36 36 0 1 0 0 72 36 36 0 0 0 0-72"
    />
  </svg>
)

const OndoMark = (props: MarkProps) => (
  <svg viewBox="0 0 480 480" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M257.02 480.6H240c-132.55 0-240-107.46-240-240C0 108.03 107.45.6 240 .6s240 107.44 240 240q-.01 17.8-2.53 34.95h-33.6a208 208 0 0 0 2.94-34.96c0-114.22-92.59-206.81-206.81-206.81S33.19 126.38 33.19 240.59 125.78 447.41 240 447.41h123a239 239 0 0 1-105.98 33.18" />
    <path d="M408.98 411.85H240c-94.58 0-171.26-76.68-171.26-171.26S145.42 69.33 240 69.33s171.26 76.68 171.26 171.26c0 11.97-1.23 23.67-3.58 34.96h-34.07a138 138 0 0 0 4.46-34.96c0-76.25-61.81-138.07-138.07-138.07s-138.07 61.82-138.07 138.07c0 76.26 61.81 138.08 138.07 138.08h197.05c-8.35 11.9-17.75 23-28.07 33.18" />
    <path d="M457.72 343.11H240c-56.62 0-102.52-45.9-102.52-102.52S183.38 138.07 240 138.07s102.52 45.9 102.52 102.52a102 102 0 0 1-6.12 34.96h-36.51A69.33 69.33 0 1 0 240 309.92h230.45a239 239 0 0 1-12.73 33.19" />
  </svg>
)

const PreStocksMark = (props: MarkProps) => (
  <svg
    viewBox="8 6 240 240"
    fill="currentColor"
    fillRule="evenodd"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <path d="m163 123-10 10-1 1h-3v-1l-13-13c-1 0-1-1-1-1h-3s0 1-1 1l-14 15-10 11-14 14-10 10-16 17-11 10-13 14-1 1c-1 0-2 0-2-1l-6-3-3-2-1-1v-7c0-2 1-3 2-4l18-19 15-15 4-4 10-10 14-15 10-10 26-28h1l1-1h5l1 1h1l25 26zm75-4v82s0 1-1 2v2l-2 2s-1 1-2 1l-95 55c-1 0-2 1-2 1h-5c-1 0-1-1-2-1l-73-42v-3l11-11c1-1 2-1 2-1h2l61 36h3l81-47c1 0 1-1 1-1 1-1 1-1 1-2v-56l18-18h1z" />
    <path d="m212 73-12 12s-1 0-2 1c0 0-1 0-1-1l-62-35c-1-1-1-1-2-1 0 0-1 0-1 1L52 96l-1 1c-1 1-1 1-1 2v54c0 1 0 2-1 2l-17 18h-2V88s1-1 1-2c1 0 1-1 2-1 0-1 1-1 1-2l95-55c1 0 1-1 2-1h5s1 1 2 1l73 42 1 1zm26 14v6c0 2-1 3-2 4l-18 19-15 15-4 4-10 11-14 14-10 10-27 28c-1 0-1 1-1 1h-1c-1 0-1 1-1 1h-3s0-1-1-1h-1s0-1-1-1l-24-26h-1v-3l1-1 10-10c1-1 1-1 2-1l1 1h1l12 13 1 1h3l1-1 15-15 10-10 14-15 10-10 16-17 10-10 13-14h2c1-1 1 0 2 0l6 3 2 2c1 0 1 0 1 1 1 0 1 1 1 1" />
  </svg>
)

const MARK: Record<VenueId, (props: MarkProps) => React.JSX.Element> = {
  bstock: BStocksMark,
  ondo: OndoMark,
  prestock: PreStocksMark,
}

/**
 * Ondo's mark is monochrome by design, so it takes the panel's own text colour.
 * The other two are brand colours; PreStocks' `#6264d9` is lifted to `#8183f0`
 * because the original is a near-black indigo on a dark panel.
 */
const MARK_COLOUR: Record<VenueId, string> = {
  bstock: 'text-[#f0b90b]',
  ondo: 'text-foreground',
  prestock: 'text-[#8183f0]',
}

export const VenueMark = ({
  venue,
  className = 'size-4',
}: {
  venue: VenueId
  className?: string
}) => {
  const Mark = MARK[venue]
  return <Mark aria-hidden="true" className={`${className} ${MARK_COLOUR[venue]} shrink-0`} />
}
