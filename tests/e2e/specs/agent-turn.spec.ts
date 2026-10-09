import type { Locator } from '@playwright/test'

import { CENT, parseUsd } from '../src/backend.js'
import { expect, test } from '../src/fixtures.js'
import { openPanel, reloadX } from '../src/live-x.js'

/**
 * The Agent tab, end to end, on real x.com with a real model behind it.
 *
 * One live turn in the whole file, on purpose: each one is a model call plus
 * several upstream reads. The question is a market question, so the agent has
 * no reason to search X, and nothing here posts, trades or signs.
 */

const QUESTION = 'How does the NVDA token price compare with the NVDA share price?'

/** Whitespace collapsed, so labels and the values beside them read as one line. */
const flatText = async (locator: Locator) => (await locator.innerText()).replace(/\s+/g, ' ')

const openAgent = async (panel: Locator) => {
  await expect(panel).toHaveAttribute('data-open', 'true')
  await panel.getByRole('button', { name: /Ask about NVDA/i }).click()
  const box = panel.getByRole('textbox', { name: 'Ask Agent' })
  await expect(box).toBeVisible()
  return box
}

/** A conversation left from an earlier run would otherwise be on screen. */
const startFresh = async (panel: Locator) => {
  const reset = panel.getByRole('button', { name: 'Start a new conversation' })
  if (await reset.isVisible()) await reset.click()
  await expect(panel).toContainText('What should I')
}

test.describe('the research agent', () => {
  test('attaching a token sends nothing and writes nothing', async ({ xTab }) => {
    // Arrange
    const panel = await openPanel(xTab.page, 'NVDA')

    // Act
    const box = await openAgent(panel)

    // Assert: an empty composer and nothing sent. A new chat has no header, so
    // the empty state is what proves we arrived.
    await startFresh(panel)
    await expect(box).toHaveValue('')
    await expect(panel.getByRole('button', { name: 'Send prompt' })).toBeDisabled()

    // A suggestion writes a whole question into the composer and stops there.
    await panel.getByRole('button', { name: 'NVDA news', exact: true }).click()
    await expect(box).toHaveValue(/recent news matters for NVDA/i)
    await expect(panel.getByRole('button', { name: 'Send prompt' })).toBeEnabled()

    // Leave the composer as it was found, so the next spec starts clean.
    await box.fill('')
  })

  test('a market question gets a consistent market card that survives a reload', async ({
    xTab,
  }) => {
    test.setTimeout(240_000)
    const { page } = xTab
    const panel = await openPanel(page, 'NVDA')
    const box = await openAgent(panel)
    await startFresh(panel)

    // Act: a question a person would type. It names no tool and asks for no card.
    await box.fill(QUESTION)
    await panel.getByRole('button', { name: 'Send prompt' }).click()

    // The turn finishes: the composer stops saying it is sending.
    await expect(panel.getByRole('button', { name: 'Sending' })).toHaveCount(0, {
      timeout: 180_000,
    })
    const answer = panel.getByRole('article', { name: 'assistant message' }).last()
    await expect(answer).toBeVisible()
    await expect(answer.getByRole('status')).toContainText('Worked')

    // The model read a quote, and the card followed from the tool result.
    await expect(answer).toContainText('How the adjusted price is made')
    const card = answer.getByRole('article').filter({ hasText: 'Adjusted price' }).first()
    const text = await flatText(card)

    // The equation on the card holds: adjusted = token price / multiplier. The
    // multiplier is shown to four places and both prices to the cent, so the
    // check allows for that rounding and nothing more.
    const equation =
      /Token price (\$[\d,]+\.\d{2}) ÷ Multiplier (\d+\.\d{4}) = Adjusted (\$[\d,]+\.\d{2})/i.exec(
        text
      )
    expect(equation, `no equation in the card: ${text}`).not.toBeNull()
    const token = parseUsd(equation![1]!)
    const multiplier = Number(equation![2])
    const adjusted = parseUsd(equation![3]!)
    expect(multiplier).toBeGreaterThanOrEqual(1)
    const roundingSlack = token * (0.00005 / multiplier) + CENT
    expect(Math.abs(token / multiplier - adjusted)).toBeLessThanOrEqual(roundingSlack)

    // The gap against the share agrees with the two prices printed under it.
    // Section labels are uppercased by CSS, which innerText reports.
    const meter = /Against the US share (In line|(\d+\.\d{2})% (below|above))/i.exec(text)
    const share = /\bShare (\$[\d,]+\.\d{2})/.exec(text)
    expect(meter, `no gap meter in the card: ${text}`).not.toBeNull()
    expect(share, `no share price in the card: ${text}`).not.toBeNull()
    const sharePrice = parseUsd(share![1]!)
    const gap = ((adjusted - sharePrice) / sharePrice) * 100
    if (meter![1]!.toLowerCase() === 'in line') {
      expect(Math.abs(gap)).toBeLessThan(0.25 + 0.01)
    } else {
      expect(meter![3]!.toLowerCase()).toBe(gap < 0 ? 'below' : 'above')
      expect(Math.abs(Math.abs(gap) - Number(meter![2]))).toBeLessThan(0.02)
    }

    // Prose arrived beside the card.
    await expect(answer.locator('p').first()).not.toBeEmpty()

    // Reload. The transcript comes back from the checkpoint, which is the only
    // durable record of what was shown: the model's own history cannot render
    // a card. This is the one reload of x.com in the suite.
    await reloadX(page)
    const restored = await openPanel(page, 'NVDA')
    await openAgent(restored)
    await expect(restored).toContainText(QUESTION, { timeout: 60_000 })
    await expect(restored).toContainText('How the adjusted price is made')
  })
})
