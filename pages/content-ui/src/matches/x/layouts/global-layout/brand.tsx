import type { SVGProps } from 'react'

/**
 * The OptimAI mark, inlined.
 *
 * Same reasoning as `modules/venue/marks.tsx`: the panel's build pipeline has
 * no SVG loader, and `@extension/ui`'s `Logo` renders an `<img>` whose `src` a
 * content script would have to resolve against x.com. A mark this small belongs
 * in the bundle as paths.
 *
 * Path data is `packages/ui/lib/assets/images/branding/icon.svg` with `white`
 * swapped for `currentColor`, so the colour is decided by the header rather
 * than baked into the artwork.
 */
/**
 * The mark's geometry, separated from the component that draws it.
 *
 * The agent's empty state draws the same mark with `framer-motion`, animating
 * the ring's `pathLength` and fading the two strokes in behind it. It needs the
 * raw geometry to do that, and a second copy of these `d` strings is a second
 * thing to get wrong when the logo changes.
 */
export const OPTIMAI_MARK_RING = { cx: 133, cy: 133, r: 123, strokeWidth: 20 } as const

export const OPTIMAI_MARK_PATHS = [
  'M234.426 217.165C227.724 225.043 220.125 232.119 211.772 238.252L201.483 220.42L116.906 74.0812C116.151 72.7603 116.151 71.2035 116.906 69.8826L129.508 48.0875C131.113 45.3042 135.172 45.3042 136.776 48.0875L223.524 198.247L234.473 217.165H234.426Z',
  'M156.693 216.268H131.49C129.98 216.268 128.611 215.513 127.856 214.193L101.757 168.998C100.152 166.215 96.1402 166.215 94.5355 168.998L64.9432 220.231L54.6544 238.063C46.2534 231.931 38.6547 224.854 32 216.929L42.9968 197.964L84.9546 125.408C87.5032 120.691 92.4588 117.436 98.1696 117.436C103.88 117.436 108.411 120.36 111.054 124.748H111.149L160.422 210.041C162.027 212.824 159.997 216.268 156.741 216.268H156.693Z',
] as const

export const OptimAiMark = (props: Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'>) => (
  <svg viewBox="0 0 266 266" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle {...OPTIMAI_MARK_RING} stroke="currentColor" />
    {OPTIMAI_MARK_PATHS.map((d) => (
      <path key={d.slice(0, 16)} d={d} fill="currentColor" />
    ))}
  </svg>
)

/**
 * Mark plus wordmark, and no coloured plate behind it.
 *
 * The plate was a green rounded square holding the letter `C`, which is what a
 * product looks like before it has a logo — and next to X's own monochrome
 * chrome it read as the loudest thing on the panel. The real mark is monochrome
 * for the same reason X's is.
 */
export const Brand = () => (
  <div className="flex min-w-0 items-center gap-2">
    <OptimAiMark className="text-foreground size-[18px] shrink-0" aria-hidden />
    <span className="text-13 text-foreground whitespace-nowrap font-semibold leading-none tracking-tight">
      OptimAI Agentic
    </span>
  </div>
)
