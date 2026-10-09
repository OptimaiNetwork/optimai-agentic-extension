import { expectedExtensionId } from '../src/chrome.js'
import { expect, test } from '../src/fixtures.js'

test.describe('extension loads in a CDP-attached Chrome', () => {
  test('installs under the id derived from the bundle path', async ({ extensionId }) => {
    // Act
    const derived = expectedExtensionId()

    // Assert
    expect(extensionId).toMatch(/^[a-p]{32}$/)
    expect(extensionId).toBe(derived)
  })

  test('injects the content UI on the real x.com', async ({ xTab }) => {
    // Assert: the shared tab is the real site, not a stub, and the UI is in
    // its open shadow root, which Playwright pierces.
    await expect(xTab.page).toHaveURL(/^https:\/\/x\.com\//)
    await expect(xTab.page).not.toHaveTitle(/stubbed for e2e/)
    await expect(xTab.page.locator('#catalyst-extension-root')).toBeAttached()
    await expect(xTab.page.locator('#catalyst-extension-container')).toBeAttached()
  })

  test('keeps the signed-in session on disk between connections', async ({ context }) => {
    // The profile outlives every run, which is what lets the suite read X
    // signed in. The session cookie is the proof; only its name is read.
    const names = (await context.cookies('https://x.com')).map((cookie) => cookie.name)
    expect(names).toContain('auth_token')
  })
})
