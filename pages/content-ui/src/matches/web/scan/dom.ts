import { BADGE_TAG } from './badge'

/** The host our popover lives under; never scanned. */
export const HOST_ID = 'catalyst-web-host'

/**
 * Elements whose text is not prose: code, form fields, editors, and anything
 * the browser does not render as text. Their whole subtree is skipped.
 */
const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
  'BUTTON',
  'CODE',
  'PRE',
  'KBD',
  'SAMP',
  'VAR',
  'SVG',
  'MATH',
  'CANVAS',
  'IFRAME',
  'OBJECT',
  'VIDEO',
  'AUDIO',
  'HEAD',
  'TITLE',
  BADGE_TAG.toUpperCase(),
])

/** Too short to hold a ticker, or nothing but whitespace and punctuation. */
const MIN_TEXT_LENGTH = 2
const HAS_WORD = /[\p{L}\p{N}]/u

export const shouldSkipElement = (element: Element): boolean => {
  if (SKIP_TAGS.has(element.tagName.toUpperCase())) return true
  if (element.id === HOST_ID || element.id === 'catalyst-extension-root') return true
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return true
  // An editor's text belongs to whoever is typing it.
  if ((element as HTMLElement).isContentEditable) return true
  return element.getAttribute('contenteditable') === 'true'
}

export const isScannableText = (node: Text): boolean => {
  const text = node.data
  return text.length >= MIN_TEXT_LENGTH && HAS_WORD.test(text)
}

/** Whether any ancestor of `node`, up to `root`, puts it out of bounds. */
export const isInsideSkipped = (node: Node, root: Node): boolean => {
  for (let current = node.parentElement; current; current = current.parentElement) {
    if (shouldSkipElement(current)) return true
    if (current === root) return false
  }
  return false
}

/**
 * Every text node under `root` worth scanning, in document order.
 *
 * A TreeWalker that rejects skipped elements outright, so their subtrees are
 * never visited — on a page with a large code block or editor that is most of
 * the work saved.
 */
export const collectTextNodes = (root: Node, limit = Infinity): Text[] => {
  const document = root.ownerDocument ?? (root as Document)
  if (root.nodeType === Node.TEXT_NODE) {
    const text = root as Text
    return isScannableText(text) && !isInsideSkipped(text, document) ? [text] : []
  }
  if (root.nodeType === Node.ELEMENT_NODE && shouldSkipElement(root as Element)) return []

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return shouldSkipElement(node as Element)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_SKIP
      }
      return isScannableText(node as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    },
  })
  const found: Text[] = []
  while (found.length < limit) {
    const next = walker.nextNode()
    if (!next) break
    found.push(next as Text)
  }
  return found
}
