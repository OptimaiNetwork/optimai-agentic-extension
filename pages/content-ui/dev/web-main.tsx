/**
 * Page highlighting on an ordinary page, outside the extension.
 *
 * Runs `startPageHighlighting` — the same function the content script runs —
 * with the extension platform shimmed, so the scan, the card and the network
 * path (allowlist included) are the ones that ship. Open /web.html on the dev
 * server; the backend must be running on :8787.
 */

// First, and on its own line: this installs `chrome` before anything reads it.
import './chrome-shim'

import { startPageHighlighting } from '@/matches/web/bootstrap'

void startPageHighlighting()
