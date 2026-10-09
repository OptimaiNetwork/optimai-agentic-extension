import { useId } from 'react'
import type { SVGProps } from 'react'

import type { WalletNamespace } from './client'

/**
 * Each chain's own mark, inlined, in its own colours.
 *
 * These were coloured dots, then monochrome glyphs. Both were a legend rather
 * than a logo: at 14px a person scanning a menu recognises a brand by its shape
 * and colour together, and stripping either one puts the whole job on the label
 * beside it.
 *
 * The artwork below is the shipping asset, unaltered — Solana's teal-to-purple
 * three-bar mark and the BNB token's white glyph on its amber disc. Because they
 * carry their own colours they take no `currentColor` and no colour map, unlike
 * `modules/venue/marks.tsx`, whose three issuer marks are monochrome by design.
 *
 * Inlined rather than fetched: a content script has no business making a network
 * call to draw a 14px icon, and the panel's build has no SVG loader.
 */

type MarkProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'>

/**
 * Three bars, each filled by its own gradient.
 *
 * The gradient ids are per-instance. Two copies of this mark in one tree would
 * otherwise both define `SVGID_1_`, and every `url(#SVGID_1_)` in the document
 * would resolve to whichever was parsed last — harmless while the copies are
 * identical, and a silent mess the moment one is not. `useId` wraps its output
 * in delimiters that vary by React version — colons on 18, guillemets on 19 —
 * and while both are legal inside a `url(#...)` reference, neither is legal in a
 * CSS selector; the colons come out so the id stays usable either way.
 */
const SolanaMark = (props: MarkProps) => {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 397.7 311.7" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient
          id={`${id}-0`}
          gradientUnits="userSpaceOnUse"
          x1="360.8791"
          y1="351.4553"
          x2="141.213"
          y2="-69.2936"
          gradientTransform="matrix(1 0 0 -1 0 314)">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient
          id={`${id}-1`}
          gradientUnits="userSpaceOnUse"
          x1="264.8291"
          y1="401.6014"
          x2="45.163"
          y2="-19.1475"
          gradientTransform="matrix(1 0 0 -1 0 314)">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient
          id={`${id}-2`}
          gradientUnits="userSpaceOnUse"
          x1="312.5484"
          y1="376.688"
          x2="92.8822"
          y2="-44.061"
          gradientTransform="matrix(1 0 0 -1 0 314)">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id}-0)`}
        d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5 c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z"
      />
      <path
        fill={`url(#${id}-1)`}
        d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5 c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z"
      />
      <path
        fill={`url(#${id}-2)`}
        d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4 c5.8,0,8.7-7,4.6-11.1L333.1,120.1z"
      />
    </svg>
  )
}

/** The BNB token: the wireframe glyph, knocked out of its amber disc. */
const BnbMark = (props: MarkProps) => (
  <svg viewBox="0 0 2496 2496" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fill="#F0B90B"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1248,0c689.3,0,1248,558.7,1248,1248s-558.7,1248-1248,1248 S0,1937.3,0,1248S558.7,0,1248,0L1248,0z"
    />
    <path
      fill="#FFFFFF"
      d="M685.9,1248l0.9,330l280.4,165v193.2l-444.5-260.7v-524L685.9,1248L685.9,1248z M685.9,918v192.3 l-163.3-96.6V821.4l163.3-96.6l164.1,96.6L685.9,918L685.9,918z M1084.3,821.4l163.3-96.6l164.1,96.6L1247.6,918L1084.3,821.4 L1084.3,821.4z"
    />
    <path
      fill="#FFFFFF"
      d="M803.9,1509.6v-193.2l163.3,96.6v192.3L803.9,1509.6L803.9,1509.6z M1084.3,1812.2l163.3,96.6 l164.1-96.6v192.3l-164.1,96.6l-163.3-96.6V1812.2L1084.3,1812.2z M1645.9,821.4l163.3-96.6l164.1,96.6v192.3l-164.1,96.6V918 L1645.9,821.4L1645.9,821.4L1645.9,821.4z M1809.2,1578l0.9-330l163.3-96.6v524l-444.5,260.7v-193.2L1809.2,1578L1809.2,1578 L1809.2,1578z"
    />
    <path
      fill="#FFFFFF"
      d="M1692.1,986.4l0.9,193.2l-281.2,165v330.8l-163.3,95.7l-163.3-95.7v-330.8l-281.2-165V986.4 L968,889.8l279.5,165.8l281.2-165.8l164.1,96.6H1692.1L1692.1,986.4z M803.9,656.5l443.7-261.6l444.5,261.6l-163.3,96.6 l-281.2-165.8L967.2,753.1L803.9,656.5L803.9,656.5z"
    />
    <polygon
      fill="#FFFFFF"
      points="1692.1,1509.6 1528.8,1605.3 1528.8,1413 1692.1,1316.4 1692.1,1509.6"
    />
  </svg>
)

const MARK: Record<WalletNamespace, (props: MarkProps) => React.JSX.Element> = {
  evm: BnbMark,
  svm: SolanaMark,
}

export const NamespaceMark = ({
  namespace,
  className = 'size-3.5',
}: {
  namespace: WalletNamespace
  className?: string
}) => {
  const Mark = MARK[namespace]
  return <Mark aria-hidden="true" className={`${className} shrink-0`} />
}
