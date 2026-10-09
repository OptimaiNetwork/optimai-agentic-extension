import { useId } from 'react'
import type { SVGProps } from 'react'

/**
 * Each trading route's own mark, inlined, in its own colours.
 *
 * The buy header named the route in words and drew the *issuer's* mark beside
 * it — so an Ondo order routed through Jupiter wore Ondo's logo, and a bStocks
 * order through PancakeSwap wore nothing at all. The chip is about the venue
 * that fills the order, so it carries that venue's mark.
 *
 * Both are the shipping artwork, unaltered:
 *
 * - PancakeSwap  https://pancakeswap.finance/images/cake.svg
 *                (the path its own manifest points `iconPath` at; everything
 *                else the site serves for this logo is PNG)
 * - Jupiter      https://jup.ag/favicon.svg
 *
 * They carry their own gradients, so the ids are per-instance. Two copies in
 * one tree would otherwise both define the same gradient id and every
 * `url(#…)` in the document would resolve to whichever was parsed last —
 * harmless while the copies are identical and a silent mess the moment one is
 * not. `useId` wraps its output in delimiters that vary by React version, and
 * while both are legal in a `url(#...)` reference neither is legal in a CSS
 * selector, so the colons come out.
 */

type MarkProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'>

const PancakeSwapMark = (props: MarkProps) => {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="48" cy="48" r="48" fill={`url(#${uid}-cake_logo_gradeint)`} />
      <path
        fill="#633001"
        fillRule="evenodd"
        d="M47.8581 79.8749C38.5164 79.8678 30.9915 77.6262 25.7338 73.5999C20.413 69.5252 17.5903 63.7429 17.5903 57.2001C17.5903 50.8957 20.4068 46.3497 23.5936 43.2769C26.0911 40.8688 28.8471 39.3265 30.7661 38.4394C30.3322 37.1076 29.7907 35.364 29.3063 33.5632C28.6582 31.1534 28.0223 28.3261 28.0223 26.2543C28.0223 23.802 28.557 21.3392 29.9986 19.4255C31.5217 17.4037 33.8146 16.3206 36.5731 16.3206C38.7289 16.3206 40.5593 17.1202 41.9922 18.4998C43.3619 19.8184 44.2735 21.5697 44.9029 23.3952C46.0089 26.6029 46.4396 30.633 46.5604 34.6548H49.2026C49.3234 30.633 49.754 26.6029 50.8601 23.3952C51.4895 21.5697 52.4011 19.8184 53.7708 18.4998C55.2037 17.1202 57.034 16.3206 59.1899 16.3206C61.9484 16.3206 64.2413 17.4037 65.7644 19.4255C67.206 21.3392 67.7407 23.802 67.7407 26.2543C67.7407 28.3261 67.1048 31.1534 66.4566 33.5632C65.9722 35.364 65.4308 37.1076 64.9968 38.4394C66.9159 39.3265 69.6719 40.8688 72.1693 43.2769C75.3562 46.3497 78.1726 50.8957 78.1726 57.2001C78.1726 63.7429 75.35 69.5252 70.0292 73.5999C64.7715 77.6262 57.2466 79.8678 47.9049 79.8749H47.8581Z"
        clipRule="evenodd"
      />
      <path
        fill="#D1884F"
        d="M36.573 18.6528C32.5327 18.6528 30.6729 21.6977 30.6729 25.9088C30.6729 29.2559 32.8339 35.9594 33.7205 38.569C33.9199 39.1559 33.6065 39.799 33.0351 40.0266C29.797 41.3164 20.241 46.039 20.241 56.8546C20.241 68.2477 29.952 76.838 47.86 76.8516C47.8671 76.8516 47.8742 76.8516 47.8814 76.8516C47.8885 76.8516 47.8956 76.8516 47.9028 76.8516C65.8107 76.838 75.5218 68.2477 75.5218 56.8546C75.5218 46.039 65.9658 41.3164 62.7277 40.0266C62.1562 39.799 61.8429 39.1559 62.0423 38.569C62.9289 35.9594 65.0898 29.2559 65.0898 25.9088C65.0898 21.6977 63.23 18.6528 59.1898 18.6528C53.374 18.6528 51.9243 26.9751 51.8209 35.907C51.814 36.5033 51.3368 36.9871 50.7465 36.9871H45.0163C44.4259 36.9871 43.9488 36.5033 43.9419 35.907C43.8385 26.9751 42.3887 18.6528 36.573 18.6528Z"
      />
      <path
        fill="#FEDC90"
        d="M47.9028 73.202C34.7449 73.202 20.2637 66.0868 20.241 56.8762C20.241 56.8906 20.241 56.905 20.241 56.9193C20.241 68.3216 29.9675 76.9164 47.9028 76.9164C65.838 76.9164 75.5645 68.3216 75.5645 56.9193C75.5645 56.905 75.5645 56.8906 75.5645 56.8762C75.5418 66.0868 61.0607 73.202 47.9028 73.202Z"
      />
      <path
        fill="#633001"
        d="M40.5919 54.0472C40.5919 57.1569 39.1371 58.7765 37.3426 58.7765C35.548 58.7765 34.0933 57.1569 34.0933 54.0472C34.0933 50.9375 35.548 49.3179 37.3426 49.3179C39.1371 49.3179 40.5919 50.9375 40.5919 54.0472Z"
      />
      <path
        fill="#633001"
        d="M61.7122 54.0472C61.7122 57.1569 60.2575 58.7765 58.4629 58.7765C56.6684 58.7765 55.2136 57.1569 55.2136 54.0472C55.2136 50.9375 56.6684 49.3179 58.4629 49.3179C60.2575 49.3179 61.7122 50.9375 61.7122 54.0472Z"
      />
      <defs>
        <linearGradient
          id={`${uid}-cake_logo_gradeint`}
          x1="48"
          x2="48"
          y1="0"
          y2="96"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#53DEE9" />
          <stop offset="1" stopColor="#1FC7D4" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const JupiterMark = (props: MarkProps) => {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g
        clipPath={`url(#${uid}-clip0_11565_169621)`}
        filter={`url(#${uid}-filter0_d_11565_169621)`}>
        {' '}
        <path
          fill={`url(#${uid}-paint0_linear_11565_169621)`}
          d="M3.09 25.167a16.433 16.433 0 0 0 11.621 6.75c-1.185-1.784-2.907-3.424-5.057-4.673-2.15-1.25-4.428-1.931-6.563-2.077Z"
        />{' '}
        <path
          fill={`url(#${uid}-paint1_linear_11565_169621)`}
          d="M12.543 22.27C8.4 19.864 3.916 19.25.708 20.334c.31 1.024.718 2.015 1.22 2.96 2.787-.065 5.83.692 8.663 2.337 2.832 1.645 4.998 3.915 6.323 6.369 1.07-.033 2.134-.17 3.177-.407-.648-3.323-3.406-6.915-7.548-9.323Z"
        />{' '}
        <path
          fill={`url(#${uid}-paint2_linear_11565_169621)`}
          d="M32.285 12.5A16.42 16.42 0 0 0 11.846.627c3.546.434 7.48 1.765 11.34 4.007 3.86 2.242 6.967 5.001 9.1 7.868Z"
        />{' '}
        <path
          fill={`url(#${uid}-paint3_linear_11565_169621)`}
          d="M27.127 20.358c-1.815-3.013-4.923-5.9-8.753-8.124-3.83-2.225-7.875-3.495-11.389-3.58-3.091-.072-5.411.826-6.363 2.466l-.02.028c-.085.308-.159.616-.226.925 1.33-.525 2.87-.817 4.584-.85 3.81-.071 8.073 1.147 12.008 3.433 3.935 2.286 7.108 5.388 8.932 8.732.818 1.506 1.329 2.99 1.53 4.407.236-.21.467-.428.691-.654l.016-.032c.952-1.641.584-4.101-1.01-6.75Z"
        />{' '}
        <path
          fill={`url(#${uid}-paint4_linear_11565_169621)`}
          d="M15.46 17.248C9.598 13.842 3.117 13.309 0 15.685c.006.745.063 1.488.17 2.224a12.904 12.904 0 0 1 2.817-.522c3.483-.262 7.322.709 10.806 2.734 3.484 2.025 6.23 4.88 7.728 8.033.414.864.73 1.771.941 2.706a16.43 16.43 0 0 0 2.017-.953c.522-3.886-3.152-9.251-9.018-12.659Z"
        />{' '}
        <path
          fill={`url(#${uid}-paint5_linear_11565_169621)`}
          d="M30.143 15.314c-1.835-3.01-4.97-5.904-8.827-8.144-3.857-2.239-7.918-3.53-11.443-3.633-2.688-.078-4.77.574-5.848 1.804 4.48-.76 10.392.517 16.121 3.845 5.73 3.329 9.767 7.832 11.326 12.1.534-1.545.07-3.676-1.329-5.972Z"
        />{' '}
      </g>{' '}
      <defs>
        {' '}
        <linearGradient
          id={`${uid}-paint0_linear_11565_169621`}
          x1="21.5"
          x2="6.667"
          y1="6.5"
          y2="32"
          gradientUnits="userSpaceOnUse">
          {' '}
          <stop offset="0" stopColor="#C7F284" /> <stop offset="1" stopColor="#00BEF0" />{' '}
        </linearGradient>{' '}
        <linearGradient
          id={`${uid}-paint1_linear_11565_169621`}
          x1="21.5"
          x2="6.667"
          y1="6.5"
          y2="32"
          gradientUnits="userSpaceOnUse">
          {' '}
          <stop offset="0" stopColor="#C7F284" /> <stop offset="1" stopColor="#00BEF0" />{' '}
        </linearGradient>{' '}
        <linearGradient
          id={`${uid}-paint2_linear_11565_169621`}
          x1="21.5"
          x2="6.667"
          y1="6.5"
          y2="32"
          gradientUnits="userSpaceOnUse">
          {' '}
          <stop offset="0" stopColor="#C7F284" /> <stop offset="1" stopColor="#00BEF0" />{' '}
        </linearGradient>{' '}
        <linearGradient
          id={`${uid}-paint3_linear_11565_169621`}
          x1="21.5"
          x2="6.667"
          y1="6.5"
          y2="32"
          gradientUnits="userSpaceOnUse">
          {' '}
          <stop offset="0" stopColor="#C7F284" /> <stop offset="1" stopColor="#00BEF0" />{' '}
        </linearGradient>{' '}
        <linearGradient
          id={`${uid}-paint4_linear_11565_169621`}
          x1="21.5"
          x2="6.667"
          y1="6.5"
          y2="32"
          gradientUnits="userSpaceOnUse">
          {' '}
          <stop offset="0" stopColor="#C7F284" /> <stop offset="1" stopColor="#00BEF0" />{' '}
        </linearGradient>{' '}
        <linearGradient
          id={`${uid}-paint5_linear_11565_169621`}
          x1="21.5"
          x2="6.667"
          y1="6.5"
          y2="32"
          gradientUnits="userSpaceOnUse">
          {' '}
          <stop offset="0" stopColor="#C7F284" /> <stop offset="1" stopColor="#00BEF0" />{' '}
        </linearGradient>{' '}
        <clipPath id={`${uid}-clip0_11565_169621`}>
          {' '}
          <path fill="#fff" d="M0 0h32.285v32H0z" />{' '}
        </clipPath>{' '}
        <filter
          id={`${uid}-filter0_d_11565_169621`}
          width="77.775"
          height="77.49"
          x="-22.745"
          y="-20.47"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse">
          {' '}
          <feFlood floodOpacity="0" result="BackgroundImageFix" />{' '}
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />{' '}
          <feOffset dy="2.274" /> <feGaussianBlur stdDeviation="11.372" />{' '}
          <feComposite in2="hardAlpha" operator="out" />{' '}
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />{' '}
          <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_11565_169621" />{' '}
          <feBlend in="SourceGraphic" in2="effect1_dropShadow_11565_169621" result="shape" />{' '}
        </filter>{' '}
      </defs>
    </svg>
  )
}

export type RouteId = 'pancakeswap' | 'jupiter'

const MARK: Record<RouteId, (props: MarkProps) => React.JSX.Element> = {
  pancakeswap: PancakeSwapMark,
  jupiter: JupiterMark,
}

export const ROUTE_LABEL: Record<RouteId, string> = {
  pancakeswap: 'PancakeSwap',
  jupiter: 'Jupiter',
}

export const RouteMark = ({
  route,
  className = 'size-3.5',
}: {
  route: RouteId
  className?: string
}) => {
  const Mark = MARK[route]
  return <Mark aria-hidden="true" className={`${className} shrink-0`} />
}
