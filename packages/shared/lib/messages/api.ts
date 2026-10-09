/**
 * What the panel can ask the background to fetch on its behalf.
 *
 * The panel runs in a content script, and Chrome attributes a content script's
 * fetch to the *page's* origin — `https://x.com`. A public https origin reaching
 * `http://localhost` is a Local Network Access request, and Chrome 153 refuses
 * it outright: "Permission was denied for this request to access the `loopback`
 * address space". It is a permission the user grants to a site, so there is
 * nothing x.com could be made to do about it and no header the server can send.
 *
 * A fetch from the background is an extension-origin request governed by
 * `host_permissions`, which is not address-space restricted. So the panel asks
 * and the background fetches.
 */

import type { ChainId, VenueId } from '../constants/env.js'

export interface ApiRequest {
  type: 'api:request'
  method: 'GET' | 'POST'
  path: string
  params?: Record<string, string | number | undefined>
  body?: unknown
  /**
   * The Agent session capability, if this call needs one.
   *
   * A typed field rather than a headers bag: the background maps it onto one
   * designated header and nothing else. Forwarding arbitrary headers from a
   * content script would put the choice of what to send in the page's half of
   * the process.
   */
  capability?: string
  /** Per-endpoint override. Agent calls acknowledge fast; collection does not block one. */
  timeoutMs?: number
  /**
   * Which backend answers this one request.
   *
   * Sent per request rather than read from storage by the background, so a
   * request cannot be answered by a chain other than the one the panel was
   * showing when it was made. Absent means the default, which keeps every
   * existing call site working unchanged.
   */
  chain?: ChainId
  /** Issuer/route selected by the panel. Absent means the legacy chain route. */
  venue?: VenueId
}

export type ApiResponse<T> =
  | { ok: true; status: number; data: T }
  | {
      ok: false
      status: number
      error: string
      /** The server's own error code, e.g. SESSION_EXPIRED. Absent for transport failures. */
      code?: string
      /** An alternate execution venue the server recommends for this request. */
      suggested_venue?: string
    }

export const API_MESSAGE_PREFIX = 'api:'

/**
 * The only paths the background will fetch for the panel.
 *
 * Chromium's guidance on moving content-script requests into the background is
 * explicit that the background must "not allow content scripts to request an
 * arbitrary URL". A base plus a caller-supplied path is not a fixed origin:
 * `new URL('//evil.example/x', 'http://localhost:8787/')` resolves to
 * `http://evil.example/x`, and so does a path that simply begins `http://`.
 */
const ALLOWED_PATHS: readonly RegExp[] = [
  /^\/stocks$/,
  /^\/stocks\/names$/,
  /^\/stocks\/resolve$/,
  /^\/stocks\/market$/,
  /^\/stocks\/market-status$/,
  /^\/stocks\/[A-Za-z0-9.-]{1,16}$/,
  /^\/stocks\/[A-Za-z0-9.-]{1,16}\/candles$/,
  /^\/stocks\/[A-Za-z0-9.-]{1,16}\/attestation$/,
  // Which pools hold this token, for the ticker page's liquidity card. Left
  // out, the background refuses the request before the network and the card
  // reports "could not read the pool directory" forever — with no failed
  // request anywhere to explain why. Exactly what happened to `/trade/receipt`
  // below, and the reason this list is worth a test.
  /^\/stocks\/[A-Za-z0-9.-]{1,16}\/pools$/,
  // Page-wide highlighting on sites other than X: the terms a page is scanned
  // for, whether a stored copy is still current, and one hover card per token.
  // None is chain-scoped: the listing travels as query parameters.
  /^\/lexicon$/,
  /^\/lexicon\/version$/,
  /^\/hover\/[A-Za-z0-9.-]{1,16}$/,
  /^\/catalyst\/(classify|brief|follow-up)$/,
  /^\/agent\/explain$/,
  /^\/agent\/conversations$/,
  /^\/agent\/conversations\/conv_[a-f0-9]{8,32}\/turns$/,
  /^\/agent\/runs\/run_[a-f0-9]{8,32}$/,
  /^\/agent\/runs\/run_[a-f0-9]{8,32}\/(tool-claims|tool-heartbeats|tool-results|cancel)$/,
  /^\/trade\/quote$/,
  // What the connected wallet holds of the payment token, so the buy screen can
  // say "you have 12.40 USDC" before somebody types an amount they cannot fund.
  /^\/trade\/balance$/,
  // Solana only: the wallet signs, this hands the signed transaction back and
  // Jupiter broadcasts it. The BSC route has no equivalent — MetaMask
  // broadcasts an EVM transaction itself.
  /^\/trade\/execute$/,
  // BSC only: whether a broadcast swap landed. MetaMask returns the hash at
  // broadcast, and a reverted swap keeps it, so the panel waits on this
  // before its success screen. Left out, the poll was refused here and the
  // screen never came.
  /^\/trade\/receipt$/,
  // Portfolio: a trade is recorded under the one wallet that made it; the views
  // read every connected wallet at once, passed as `bnb` / `solana` query
  // parameters. The API validates each address before MongoDB is touched.
  /^\/portfolio\/(?:bnb\/0x[a-fA-F0-9]{40}|solana\/[1-9A-HJ-NP-Za-km-z]{32,44})\/trades$/,
  /^\/portfolio\/(?:trades|stats|history)$/,
]

export const isAllowedApiPath = (path: string): boolean =>
  ALLOWED_PATHS.some((allowed) => allowed.test(path))

/** Only this one. The capability must never reach an unrelated host or path. */
export const SESSION_HEADER = 'X-Catalyst-Session'

/** Codes the panel branches on rather than merely displays. */
export const API_ERROR_CODES = {
  sessionExpired: 'SESSION_EXPIRED',
  runCancelled: 'RUN_CANCELLED',
  resultConflict: 'RESULT_CONFLICT',
  claimConflict: 'CLAIM_CONFLICT',
  turnInProgress: 'TURN_IN_PROGRESS',
  payloadTooLarge: 'PAYLOAD_TOO_LARGE',
  unknownToolCall: 'UNKNOWN_TOOL_CALL',
} as const
