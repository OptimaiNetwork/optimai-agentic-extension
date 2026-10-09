/**
 * Whether the page under the popover is dark right now.
 *
 * Read from the page rather than from the OS: X's theme is a setting inside X,
 * and a news site may be dark on a light system. A card sitting on the page has
 * to match what is actually around it.
 */
export const isDarkPage = (): boolean => {
  const background = getComputedStyle(document.body).backgroundColor
  const [r = 255, g = 255, b = 255, alpha = 1] = background.match(/[\d.]+/g)?.map(Number) ?? []
  // A transparent body means the page paints its background somewhere else;
  // the root element is the next best guess, and white is the web's default.
  if (alpha === 0) {
    const root = getComputedStyle(document.documentElement).backgroundColor
    const [rr = 255, rg = 255, rb = 255, ra = 1] = root.match(/[\d.]+/g)?.map(Number) ?? []
    if (ra === 0) return false
    return rr * 0.299 + rg * 0.587 + rb * 0.114 < 128
  }
  return r * 0.299 + g * 0.587 + b * 0.114 < 128
}
