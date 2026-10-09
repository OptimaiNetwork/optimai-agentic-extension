/**
 * An identicon for an address, derived rather than drawn.
 *
 * "Random, but persisted" is the requirement, and the cheapest way to persist
 * something is not to store it: the same address always hashes to the same two
 * hues, so the avatar survives a re-render, a route change, a reload and a
 * second device without anything being written anywhere. A stored random value
 * would also have to be invalidated when the account changes, which is exactly
 * the bug it would be introduced to avoid.
 *
 * It is also a weak fingerprint worth having. Two accounts in the same wallet
 * differ by four characters in the middle of a truncated address, which nobody
 * reads; they differ obviously by colour.
 */

/** FNV-1a. Not for security — only for spreading addresses across the wheel. */
const hash = (value: string): number => {
  let result = 0x811c9dc5
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 0x01000193)
  }
  return result >>> 0
}

export interface Avatar {
  from: string
  to: string
}

const cache = new Map<string, Avatar>()

/**
 * Saturation and lightness are fixed so every avatar carries the same weight
 * against a dark panel — only hue varies. Letting all three vary produces
 * discs that read as "disabled" next to ones that read as "alert".
 *
 * Nothing is written inside the disc. Two characters off the address are the
 * two nobody reads, and at 18px they turned a clean mark into a smudge; the
 * address itself is already next to it, in full on hover.
 */
const SATURATION = 62
const LIGHTNESS = 52

/** Far enough apart to read as a gradient rather than as a flat colour. */
const HUE_SPREAD = 64

export const avatarFor = (address: string): Avatar => {
  const key = address.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const seed = hash(key)
  const hue = seed % 360
  const avatar: Avatar = {
    from: `hsl(${hue} ${SATURATION}% ${LIGHTNESS}%)`,
    to: `hsl(${(hue + HUE_SPREAD) % 360} ${SATURATION}% ${LIGHTNESS - 14}%)`,
  }

  cache.set(key, avatar)
  return avatar
}

/** `0x8B2f…1934` — enough to recognise, short enough for a 500px header. */
export const shortAddress = (address: string): string =>
  address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`
