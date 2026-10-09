import { afterEach, expect, it, vi } from 'vitest'

import { fetchForPanel } from './fetcher'

afterEach(() => vi.unstubAllGlobals())

const LOGO = 'data:image/webp;base64,UklGRg=='

it('asks the server to inline logos, on catalog and shared routes alike', async () => {
  const seen: URL[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      seen.push(new URL(String(input)))
      return Response.json({ items: [] })
    })
  )

  await fetchForPanel({
    type: 'api:request',
    method: 'GET',
    path: '/stocks',
    chain: 'solana',
    venue: 'prestock',
  })
  await fetchForPanel({
    type: 'api:request',
    method: 'GET',
    path: '/portfolio/stats',
    params: { solana: '7Zp1QhA8rJ9cN4sL6xVtK2mB5dF3gH8jP1qR6wS9uT2' },
  })

  expect(seen.map((url) => url.pathname)).toEqual(['/solana/stocks', '/portfolio/stats'])
  expect(seen.map((url) => url.searchParams.get('logo'))).toEqual(['inline', 'inline'])
})

it('hands the server-inlined logo through without fetching anything else', async () => {
  // The logo used to be fetched here from `/static/stock-logos/`; the server
  // now does that when asked, so the panel makes one request and no more.
  const fetchMock = vi.fn(async () =>
    Response.json({
      items: [{ symbol: 'SPACEX', logo_url: '/static/stock-logos/spacex-123.webp', logo: LOGO }],
    })
  )
  vi.stubGlobal('fetch', fetchMock)

  const result = await fetchForPanel<{ items: Array<{ logo: string }> }>({
    type: 'api:request',
    method: 'GET',
    path: '/stocks',
    chain: 'solana',
    venue: 'prestock',
  })

  expect(result.ok).toBe(true)
  if (result.ok) expect(result.data.items[0]?.logo).toBe(LOGO)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
