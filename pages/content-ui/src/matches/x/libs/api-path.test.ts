import { isAllowedApiPath } from '@extension/shared'
import { describe, expect, it } from 'vitest'

describe('what the background will fetch on the panel’s behalf', () => {
  it('allows the endpoints the panel actually calls', () => {
    for (const path of [
      '/stocks',
      '/stocks/resolve',
      '/stocks/market',
      '/stocks/market-status',
      '/stocks/NVDA',
      '/stocks/NVDA/candles',
      '/stocks/NVDA/attestation',
      '/catalyst/brief',
      '/catalyst/follow-up',
      '/trade/quote',
      '/agent/explain',
      '/agent/conversations',
      '/agent/conversations/conv_0123456789abcdef/turns',
      '/agent/runs/run_0123456789abcdef',
      '/agent/runs/run_0123456789abcdef/tool-claims',
      '/agent/runs/run_0123456789abcdef/tool-heartbeats',
      '/agent/runs/run_0123456789abcdef/tool-results',
      '/agent/runs/run_0123456789abcdef/cancel',
    ]) {
      expect(isAllowedApiPath(path), path).toBe(true)
    }
  })

  it('refuses an agent path whose IDs are not the shape the server issues', () => {
    // The IDs are hex with a fixed prefix. A permissive `[^/]+` here would let a
    // path segment carry `..` or an encoded slash into the URL join.
    for (const path of [
      '/agent/runs/run_../../etc',
      '/agent/runs/notarun/cancel',
      '/agent/conversations/conv_xyz/turns',
      '/agent/runs/run_0123456789abcdef/anything',
      '/agent/conversations/conv_0123456789abcdef',
    ]) {
      expect(isAllowedApiPath(path), path).toBe(false)
    }
  })

  it('refuses a path that would leave the backend’s origin', () => {
    // A base plus a caller-supplied path is not a fixed origin. Both of these
    // resolve to evil.example when joined onto http://localhost:8787.
    expect(isAllowedApiPath('//evil.example/x')).toBe(false)
    expect(isAllowedApiPath('http://evil.example/x')).toBe(false)
    expect(isAllowedApiPath('https://evil.example/x')).toBe(false)
  })

  it('refuses anything else, including paths that merely look close', () => {
    for (const path of ['/', '/stocks/../../etc', '/catalyst/anything', '/stocks/NVDA/../../x']) {
      expect(isAllowedApiPath(path), path).toBe(false)
    }
  })
})
