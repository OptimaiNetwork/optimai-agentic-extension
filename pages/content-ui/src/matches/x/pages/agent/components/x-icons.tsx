import type { SVGProps } from 'react'

/**
 * X's own glyphs, drawn path-for-path from X's own SVGs so a post here reads
 * the way a post reads on X.
 *
 * Inlined as components rather than imported through `svg?react`: that repo
 * runs `vite-plugin-svgr`, this one does not, and the Electron renderer build
 * and the web mockup both have to resolve the same module. Every path fills
 * with `currentColor`, so the caller sets the colour.
 *
 * Six glyphs, because six is what that icon set ships. Likes use lucide's
 * `Heart` there and do the same here, so the set stays a copy rather than a
 * copy plus one invented path.
 */

type IconProps = SVGProps<SVGSVGElement>

/**
 * Decorative by default, because most of these sit beside a count or a label
 * that already says what they are. Pass `aria-label` and the glyph becomes an
 * `img` with that name instead — a badge with no text beside it has to carry
 * its own, or a screen reader reaches it and learns nothing.
 */
function base(props: IconProps): IconProps {
  const labelled = Boolean(props['aria-label'] ?? props['aria-labelledby'])
  return {
    fill: 'currentColor',
    xmlns: 'http://www.w3.org/2000/svg',
    ...(labelled ? { role: 'img' } : { 'aria-hidden': true }),
  }
}

export function ReplyIcon(props: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base(props)} {...props}>
      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
    </svg>
  )
}

export function RepostIcon(props: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base(props)} {...props}>
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
    </svg>
  )
}

export function ViewIcon(props: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base(props)} {...props}>
      <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
    </svg>
  )
}

export function VerifiedIcon(props: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 256 256" {...base(props)} {...props}>
      <path d="M128,24A104,104,0,1,0,232,128,104.12041,104.12041,0,0,0,128,24Zm49.53125,85.78906-58.67187,56a8.02441,8.02441,0,0,1-11.0625,0l-29.32813-28a8.00675,8.00675,0,0,1,11.0625-11.57812l23.79687,22.72656,53.14063-50.72656a8.00675,8.00675,0,0,1,11.0625,11.57812Z" />
    </svg>
  )
}

export function BookmarkIcon(props: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base(props)} {...props}>
      <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z" />
    </svg>
  )
}

export function ShareIcon(props: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base(props)} {...props}>
      <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" />
    </svg>
  )
}

/**
 * X's default profile picture: the grey silhouette an account with no image
 * gets. X never falls back to initials, so neither do these cards — a pair of
 * letters where X shows a person is the single loudest tell that a row is not
 * a real timeline row.
 *
 * Two tones, so it reads as a picture rather than as a glyph: the plate takes
 * the caller's colour at low opacity, the figure takes it solid.
 */
export function DefaultAvatarIcon(props: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base(props)} {...props}>
      <rect width="24" height="24" fill="currentColor" opacity="0.16" />
      {/* The figure is drawn wider and taller than the circle on purpose: the
          avatar clips it, so the shoulders run off the sides and the bottom
          exactly the way X's default picture does. A figure that fits inside
          the circle reads as an icon sitting on a plate instead. */}
      <circle cx="12" cy="9.1" r="3.7" fill="currentColor" opacity="0.55" />
      <path
        d="M12 13.7c-4.9 0-8.8 3.2-8.8 7.2V24h17.6v-3.1c0-4-3.9-7.2-8.8-7.2z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  )
}

/**
 * X's wordmark, for the plate on a card whose content came off X. Not from
 * the icon set above — that set is the post-action glyphs — but it is X's own
 * mark for the same reason those are X's own paths.
 */
export function XLogoIcon(props: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" {...base(props)} {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
