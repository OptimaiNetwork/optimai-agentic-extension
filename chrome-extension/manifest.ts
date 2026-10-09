import type { ManifestType } from '@extension/shared'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'))

const DEFAULT_CATALYST_API_URL = 'https://agentic-api.optimai.network'

/**
 * Where the panel may call the backend: the hosted OptimAI Agentic server by
 * default, loopback on port 8787 for a local server, plus the origin of
 * `CEB_CATALYST_API_URL` when it is set. The URL is read at build time, the same way the bundles read
 * it, and an unusable value fails the build instead of shipping a panel whose
 * every request is blocked.
 */
const catalystHostPermissions = (): string[] => {
  const origins = new Set(['http://localhost:8787/*', 'http://127.0.0.1:8787/*'])
  const configured = process.env.CEB_CATALYST_API_URL || DEFAULT_CATALYST_API_URL
  let url: URL
  try {
    url = new URL(configured)
  } catch {
    throw new Error(`CEB_CATALYST_API_URL is not a valid URL: ${configured}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`CEB_CATALYST_API_URL must be http(s), got ${url.protocol}`)
  }
  origins.add(`${url.protocol}//${url.host}/*`)
  return [...origins]
}

/**
 * Every http(s) page the off-X scripts stay away from: X, which has its own
 * entry; places a person types or signs, where an underline in their text or
 * their wallet is the last thing wanted; and the trading venues themselves,
 * where every word is a ticker.
 */
const OFF_X_EXCLUDES = [
  '*://x.com/*',
  '*://*.x.com/*',
  '*://twitter.com/*',
  '*://*.twitter.com/*',
  '*://mail.google.com/*',
  '*://docs.google.com/*',
  '*://accounts.google.com/*',
  '*://*.pancakeswap.finance/*',
  '*://jup.ag/*',
  '*://*.jup.ag/*',
  '*://*.metamask.io/*',
  '*://*.binance.com/*',
]

/**
 * @prop default_locale
 * if you want to support multiple languages, you can use the following reference
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
 *
 * @prop browser_specific_settings
 * Must be unique to your extension to upload to addons.mozilla.org
 * (you can delete if you only want a chrome extension)
 *
 * @prop permissions
 * Firefox doesn't support sidePanel (It will be deleted in manifest parser)
 *
 * @prop content_scripts
 * css: ['content.css'], // public folder
 */
const manifest = {
  manifest_version: 3,
  name: 'OptimAI Agentic',
  version: packageJson.version,
  description:
    'Spot tokenized-stock catalysts on X, ask an agent about them, and buy on BNB Chain.',
  // The panel calls the Catalyst backend through the background worker.
  // Loopback is for development; a deployed backend is added from
  // CEB_CATALYST_API_URL at build time. x.com's own CSP does not apply to an
  // isolated-world script, but it does apply to anything running in the MAIN
  // world, which is why the network layer stays out of there.
  host_permissions: catalystHostPermissions(),
  permissions: ['storage'],
  // permissions: ['storage', 'nativeMessaging'],
  // optional_permissions: ['cookies'],
  // optional_host_permissions: ['*://twitter.com/*', '*://x.com/*'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'icon-32.png',
  },
  icons: {
    256: 'icon-256.png',
    128: 'icon-128.png',
    32: 'icon-32.png',
  },
  content_scripts: [
    {
      // MAIN world, declared rather than injected: x.com's CSP blocks a <script>
      // tag, and document_start is the only moment early enough to take a
      // reference to XMLHttpRequest.prototype before X's own bundle does.
      matches: ['*://twitter.com/*', '*://x.com/*'],
      js: ['content/x-network.iife.js'],
      world: 'MAIN',
      run_at: 'document_start',
    },
    {
      // Also MAIN world, and for the same reason: MetaMask only registers its
      // Solana Wallet Standard wallet in the page, and only serves its
      // multichain API to page senders. An extension port gets EIP-1193 and
      // nothing else, so the Solana half of the wallet has to live here.
      matches: ['*://twitter.com/*', '*://x.com/*'],
      js: ['content/svm-wallet.iife.js'],
      world: 'MAIN',
      run_at: 'document_start',
    },
    {
      matches: ['*://twitter.com/*', '*://x.com/*'],
      exclude_matches: ['*://twitter.com/i/flow/*', '*://x.com/i/flow/*', '*://x.com/i/oauth2/*'],
      js: ['content-ui/x.iife.js'],
      css: ['content.css'],
    },
    {
      // Every other page: find the tokenized stocks it mentions, put a card
      // behind each one, and open the trade panel from the card. No agent here.
      matches: ['http://*/*', 'https://*/*'],
      exclude_matches: OFF_X_EXCLUDES,
      js: ['content-ui/web.iife.js'],
      run_at: 'document_idle',
    },
    {
      // The Solana wallet bridge on those same pages, as on X: MetaMask serves
      // its Solana wallet to web pages only, and the trade panel injected into
      // the page reaches it here.
      matches: ['http://*/*', 'https://*/*'],
      exclude_matches: OFF_X_EXCLUDES,
      js: ['content/svm-wallet.iife.js'],
      world: 'MAIN',
      run_at: 'document_start',
    },
  ],
  web_accessible_resources: [
    {
      resources: [
        '*.js',
        '*.css',
        '*.svg',
        'icon-256.png',
        'icon-128.png',
        'icon-32.png',
        // 'permissions/index.html',
      ],
      // Not `*://*/*`. These resources are only ever injected into the two
      // hosts this extension runs on, and every extra origin here is another
      // page that can fetch them to prove the extension is installed.
      matches: ['*://twitter.com/*', '*://x.com/*'],
    },
  ],
} satisfies ManifestType

export default manifest
