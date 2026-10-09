import type { CSSProperties } from 'react'

// The reduced-motion rule travels with the component. app/globals.css calms CSS
// animation globally, but the registry bundles imports only, so an installed
// copy never receives that reset.
//
// `!important` because the sweep is an inline style, which outranks a plain rule
// in a media query. It selects a marker class carried by TEXT_SHIMMER_CLASS_NAME
// so it also reaches consumers that build their own span out of these exports.
export const TEXT_SHIMMER_KEYFRAMES =
  '@keyframes beui-text-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}' +
  '@media (prefers-reduced-motion: reduce){.beui-text-shimmer{animation:none !important}}'

// The upstream shimmer gradient is written with `var(--muted-foreground)` and
// `var(--foreground)`, which a Tailwind 4 `@theme` block defines as real
// custom properties. This repo keeps its palette as hex in the Tailwind 3
// config and defines neither, so that gradient was invalid, the
// background resolved to `none`, and `bg-clip-text text-transparent` left
// the text invisible. `theme()` resolves at build time to the same colours.
export const TEXT_SHIMMER_CLASS_NAME =
  'beui-text-shimmer bg-[length:200%_100%] bg-clip-text text-transparent bg-[linear-gradient(110deg,theme(colors.faint)_30%,theme(colors.foreground)_50%,theme(colors.faint)_70%)]'

export function textShimmerStyle(duration: number): CSSProperties {
  return {
    animation: `beui-text-shimmer ${duration}s linear infinite`,
  }
}
