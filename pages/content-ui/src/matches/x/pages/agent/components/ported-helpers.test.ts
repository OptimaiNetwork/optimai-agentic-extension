/**
 * The pure helpers behind the agent panel's post rendering, pinned in one place.
 *
 * The avatar allowlist is the one with teeth: these URLs come out of posts the
 * collector read off a page, and this panel runs inside x.com with the user
 * signed in. An `src` that is not checked is an outbound request from that
 * session to wherever a post author chose.
 */

import { describe, expect, it } from 'vitest'

import { compactNumber, formatCount } from './format-count'
import { formatRelativeTime } from './format-relative-time'
import { isEntity, trimEntity } from './post-entities'
import { safeAvatarUrl } from './safe-avatar'

describe('safeAvatarUrl', () => {
  it('accepts X media over https', () => {
    expect(safeAvatarUrl('https://pbs.twimg.com/profile_images/1/a_normal.jpg')).toBe(
      'https://pbs.twimg.com/profile_images/1/a_normal.jpg'
    )
  })

  it.each([
    ['http, not https', 'http://pbs.twimg.com/profile_images/1.jpg'],
    ['another host entirely', 'https://evil.example/pixel.gif'],
    ['a host that merely ends in the right name', 'https://notpbs.twimg.com.evil.test/a.jpg'],
    ['embedded credentials', 'https://user:pass@pbs.twimg.com/a.jpg'],
    ['a javascript url', 'javascript:alert(1)'],
    ['a data url', 'data:image/svg+xml;base64,PHN2Zz4='],
    ['nonsense', 'not a url at all'],
  ])('refuses %s', (_label, value) => {
    expect(safeAvatarUrl(value)).toBeUndefined()
  })

  it('refuses an absent value rather than throwing', () => {
    expect(safeAvatarUrl(undefined)).toBeUndefined()
    expect(safeAvatarUrl(null)).toBeUndefined()
  })
})

describe('compactNumber', () => {
  it('hides a zero the way X does', () => {
    // A row of zeroes reads as a dead post when it is an unengaged one.
    expect(compactNumber(0)).toBe('')
    expect(compactNumber(undefined)).toBe('')
  })

  it('abbreviates thousands and millions', () => {
    expect(compactNumber(999)).toBe('999')
    expect(compactNumber(1500)).toBe('1.5K')
    expect(compactNumber(2_400_000)).toBe('2.4M')
  })

  it('keeps a real zero where a zero is a reading', () => {
    expect(formatCount(0)).toBe('0')
  })
})

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-09-22T12:00:00Z')

  it.each([
    ['2026-09-22T11:59:30Z', 'now'],
    ['2026-09-22T11:45:00Z', '15m'],
    ['2026-09-22T09:00:00Z', '3h'],
    ['2026-09-20T12:00:00Z', '2d'],
  ])('renders %s as %s', (iso, expected) => {
    expect(formatRelativeTime(iso, now)).toBe(expected)
  })

  it('returns undefined for an unparsable timestamp rather than Invalid Date', () => {
    expect(formatRelativeTime('whenever', now)).toBeUndefined()
  })
})

describe('post entities', () => {
  it.each(['@someone', '#NVDA', 'https://example.com/a', 'www.example.com'])(
    'recognises %s',
    (chunk) => {
      expect(isEntity(chunk)).toBe(true)
    }
  )

  it('leaves trailing punctuation outside the entity', () => {
    // Otherwise a sentence-ending full stop gets painted as part of the link.
    expect(trimEntity('https://example.com/a.').text).toBe('https://example.com/a')
    expect(trimEntity('@someone,').text).toBe('@someone')
  })

  it('does not treat ordinary prose as an entity', () => {
    expect(isEntity('deliveries')).toBe(false)
  })
})
