import { CatalystApiError } from './catalyst'

/**
 * What a failed backend call means, and how the panel should say it.
 *
 * One rule: print what actually happened. The market list used to answer an
 * unreachable backend with `cd server && uv run uvicorn …` — a shell command
 * guessed at the reader's machine, printed in place of the error, and wrong for
 * anyone who is not the person who wrote it. The detail endpoints made the
 * opposite trade and were worse for it: any failure at all read as "Not
 * available on this issuer", so a server that was simply not running looked
 * like a verdict about the token.
 *
 * `quote-error.ts` reached this conclusion first, for the same reason — see its
 * header on the KYT block that got printed as a liquidity problem.
 */

/**
 * Whether nothing answered at all.
 *
 * `fetcher.ts` reports every transport failure — a server that is not running, a
 * DNS miss, an aborted timeout — as status 0, and every HTTP reply as its own
 * status. So this reads a field rather than guessing at the wording of `fetch`'s
 * message, which differs between browsers and locales and was what the old
 * `/failed to fetch|load failed|networkerror|refus/i` test depended on.
 */
export const isUnreachable = (error: unknown): boolean =>
  error instanceof CatalystApiError && error.status === 0

/** The status the backend replied with, or `undefined` if nothing replied. */
export const statusOf = (error: unknown): number | undefined =>
  error instanceof CatalystApiError && error.status > 0 ? error.status : undefined

/**
 * Whether the backend answered, and said this thing does not exist.
 *
 * The one case where a page may state a conclusion about the token rather than
 * about the request: the catalog was reachable and it looked.
 */
export const isNotFound = (error: unknown): boolean => statusOf(error) === 404

/** The raw message, never empty — callers put this where the reason belongs. */
const messageOf = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return raw.trim() || 'Unknown error'
}

export type RequestFailure = {
  /** One line naming what failed. Safe as a heading. */
  title: string
  /** The reason itself: the transport error, or the server's own `detail`. */
  detail: string
}

/**
 * Describe a failed call in the two lines a user can act on.
 *
 * Never invents a cause and never suggests a fix — the server's `detail` is
 * already a sentence someone wrote, and a transport failure is its own
 * explanation.
 */
export const describeRequestFailure = (error: unknown): RequestFailure => {
  if (isUnreachable(error)) {
    return { title: 'Could not reach the backend', detail: messageOf(error) }
  }

  const status = statusOf(error)
  if (status !== undefined) {
    const message = messageOf(error)
    return {
      title: `The backend answered ${status}`,
      // `fetcher.ts` falls back to `HTTP <status>` when the reply carries no
      // JSON body to read a sentence out of. Printing that under a title that
      // already says the status is the status twice and an explanation zero
      // times; saying there was no body is at least a fact about the reply.
      detail: message === `HTTP ${status}` ? 'The reply carried no error detail.' : message,
    }
  }

  return { title: 'The request failed', detail: messageOf(error) }
}
