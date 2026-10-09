// Inline entities X renders in link blue: @mentions, #hashtags, and URLs.
// Highlighting is purely presentational — the underlying text stays plain, so
// nothing here can change what the agent actually observed.

// A URL is either an explicit scheme (http/https), a www. host, or a bare
// host.tld. We stop the match before trailing punctuation so a sentence-ending
// "." or ")" after a link is not coloured.
const URL = String.raw`(?:https?:\/\/|www\.)[^\s]+|[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?(?:\.[\p{L}\p{N}-]+)*\.(?:com|net|org|io|co|ai|app|dev|xyz|gg|so|me|tv|info|news|finance|eth|sol|fi|to|link)\b[^\s]*`
const TAG = String.raw`[#@][\p{L}\p{N}_]+`

// Trailing punctuation we don't want painted as part of a link.
const TRAILING = /[.,;:!?)\]}'"]+$/

// Group 1 captures so `split` keeps the entity tokens.
export const ENTITY_SOURCE = `(${URL}|${TAG})`

export function entityRegex(): RegExp {
  return new RegExp(ENTITY_SOURCE, 'giu')
}

export function isEntity(chunk: string): boolean {
  return new RegExp(`^(?:${ENTITY_SOURCE})$`, 'iu').test(chunk)
}

/** Strips trailing punctuation from a matched entity. */
export function trimEntity(match: string): { text: string; trimmed: number } {
  const text = match.replace(TRAILING, '')
  return { text, trimmed: match.length - text.length }
}
