import { BACKEND_URL } from './backend.js'
import { resetXRunState } from './live-x.js'

const HEALTH_TIMEOUT_MS = 5_000

/**
 * Refuse to start without the real backend, and start the x.com load log afresh.
 *
 * Every spec talks to the server the extension is built to call. Without it the
 * panel renders error states and each spec times out on its own, twenty seconds
 * at a time, with nothing saying why. One check here says why, once.
 */
export default async function globalSetup(): Promise<void> {
  resetXRunState()

  const url = `${BACKEND_URL}/health`
  let problem: string
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) })
    if (response.ok) return
    problem = `it answered ${response.status}`
  } catch (error) {
    const cause = error instanceof Error ? (error.cause as Error | undefined) : undefined
    problem = cause?.message ?? (error instanceof Error ? error.message : String(error))
  }
  throw new Error(
    [
      `The e2e suite needs the real backend, and ${url} is not healthy (${problem}).`,
      'Check the hosted server, or run optimai-agentic-server locally and point the build and suite at it:',
      '  cd ../optimai-agentic-server && uv run uvicorn app.main:app --port 8787',
      '  CEB_CATALYST_API_URL=http://localhost:8787 pnpm build',
    ].join('\n')
  )
}
