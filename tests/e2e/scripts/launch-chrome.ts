import { chromium } from '@playwright/test'
import { ensureChrome } from '../src/chrome.js'
import { ensureExtensionLoaded } from '../src/extension.js'
import { EXTENSION_DIST, PROFILE_DIR } from '../src/paths.js'

const endpoint = await ensureChrome()
const browser = await chromium.connectOverCDP(endpoint)
const extensionId = await ensureExtensionLoaded(browser)
await browser.close()

console.log('Chrome ready.')
console.log(`  CDP:          ${endpoint}`)
console.log(`  profile:      ${PROFILE_DIR}`)
console.log(`  extension:    ${EXTENSION_DIST}`)
console.log(`  extension id: ${extensionId}`)
console.log('\nLog into X in that window once. The session persists for later runs.')
