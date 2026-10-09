import type { LexiconTerm } from '../services/types'

/**
 * Finds lexicon terms in a run of text.
 *
 * Not one regular expression with 2,500 alternatives. V8 tries every branch at
 * every position, which on an article is tens of millions of steps. Instead the
 * text is cut into words once, and each word is looked up by its lower-case
 * spelling in a map of the terms that start with it — so the cost is one pass
 * over the text plus a few string comparisons where something starts to match.
 *
 * The rules each term carries, set by the server (`app/lexicon/rules.py`):
 *
 * - `exact`: the page spells it exactly so. `TSLA` is Tesla; `tsla` is not.
 * - `capitalized`: any case, but each word the company capitalises must be
 *   capitalised on the page. `Nvidia` and `NVIDIA` are NVIDIA; `nvidia` is not.
 * - `needs_context`: the term is also an ordinary word (`ON`, `NOW`, `Con`), so
 *   it counts only after `$`, inside parentheses, or after an exchange prefix.
 */

export interface TermMatch {
  /** Offset of the first character, including a leading `$`. */
  start: number
  /** Offset one past the last character. */
  end: number
  ticker: string
  term: LexiconTerm
}

interface Candidate {
  term: LexiconTerm
  /** Lower-cased, with typographic apostrophes and spaces normalised. */
  folded: string
  length: number
}

export interface Matcher {
  byFirstWord: Map<string, Candidate[]>
  size: number
}

/** A word: letters and digits, joined by `.`, `'`, `’`, `&` or `-` (`AT&T`, `BRK.B`, `Coca-Cola`). */
const WORD = /[\p{L}\p{N}]+(?:[.'’&-][\p{L}\p{N}]+)*/gu
const TOKEN = /\$?[\p{L}\p{N}]+(?:[.'’&-][\p{L}\p{N}]+)*/gu
const WORD_CHAR = /[\p{L}\p{N}_]/u
const UPPER = /\p{Lu}/u
const POSSESSIVE = /['’]s$/iu
const SPLIT_AT = /[-.'’&]/u
const EXCHANGE_PREFIX =
  /\b(?:NASDAQ|NYSE(?:\s?American|ARCA)?|AMEX|OTC(?:QX|QB)?|CBOE|BATS|TSX|LSE)\s*:\s*$/i
/** How far back an exchange prefix or an opening parenthesis may sit. */
const CONTEXT_WINDOW = 24

/** Same length in, same length out: every whitespace character becomes one space. */
const fold = (text: string): string => text.replace(/\s/g, ' ').replace(/’/g, "'").toLowerCase()

const firstWord = (term: string): string | null => {
  WORD.lastIndex = 0
  const match = WORD.exec(term)
  return match ? fold(match[0]) : null
}

export const compileMatcher = (terms: readonly LexiconTerm[]): Matcher => {
  const byFirstWord = new Map<string, Candidate[]>()
  for (const term of terms) {
    const key = firstWord(term.term)
    if (!key) continue
    const candidate = { term, folded: fold(term.term), length: term.term.length }
    const list = byFirstWord.get(key)
    if (list) list.push(candidate)
    else byFirstWord.set(key, [candidate])
  }
  for (const list of byFirstWord.values()) {
    // Longest first, so "Bank of America" wins over a shorter term that shares
    // its first word; among equal lengths an exact rule is tried before a looser one.
    list.sort(
      (a, b) =>
        b.length - a.length || Number(b.term.case === 'exact') - Number(a.term.case === 'exact')
    )
  }
  return { byFirstWord, size: terms.length }
}

/** Every spelling of a page word a term could start with: `Tesla's` is also `Tesla`. */
const keysFor = (word: string): string[] => {
  const folded = fold(word)
  const keys = [folded]
  const bare = folded.replace(POSSESSIVE, '')
  if (bare !== folded) keys.push(bare)
  const head = folded.split(SPLIT_AT)[0]
  if (head && !keys.includes(head)) keys.push(head)
  return keys
}

const caseHolds = (text: string, term: LexiconTerm): boolean => {
  if (term.case === 'exact') return fold(text) === fold(term.term) && sameCase(text, term.term)
  const pageWords = text.split(/\s+/)
  const termWords = term.term.split(/\s+/)
  if (pageWords.length !== termWords.length) return false
  return termWords.every((word, index) => {
    const first = word.charAt(0)
    if (!UPPER.test(first)) return true
    return UPPER.test(pageWords[index].charAt(0))
  })
}

/** Exact spelling, allowing only for typographic apostrophes and spaces. */
const sameCase = (text: string, term: string): boolean =>
  text.replace(/’/g, "'").replace(/\s/g, ' ') === term.replace(/’/g, "'").replace(/\s/g, ' ')

const hasContext = (text: string, start: number, end: number, dollar: boolean): boolean => {
  if (dollar) return true
  const before = text.slice(Math.max(0, start - CONTEXT_WINDOW), start)
  if (EXCHANGE_PREFIX.test(before)) return true
  return /\(\s*$/.test(before) && /^\s*\)/.test(text.slice(end, end + 3))
}

/**
 * Every non-overlapping match in `text`, left to right.
 *
 * `limit` stops early on text that is nothing but tickers, so one table cannot
 * spend the whole page's budget.
 */
export const findMatches = (text: string, matcher: Matcher, limit = Infinity): TermMatch[] => {
  const found: TermMatch[] = []
  if (!matcher.size || !text) return found

  TOKEN.lastIndex = 0
  let token: RegExpExecArray | null
  while (found.length < limit && (token = TOKEN.exec(text)) !== null) {
    const dollar = token[0].charCodeAt(0) === 36 // '$'
    const wordStart = token.index + (dollar ? 1 : 0)
    // `US$5` or `ab$C`: a `$` glued to a word is not a cashtag.
    const glued = dollar && token.index > 0 && WORD_CHAR.test(text.charAt(token.index - 1))
    const word = token[0].slice(dollar ? 1 : 0)

    let matched: TermMatch | null = null
    for (const key of keysFor(word)) {
      for (const candidate of matcher.byFirstWord.get(key) ?? []) {
        const end = wordStart + candidate.length
        if (end > text.length) continue
        const slice = text.slice(wordStart, end)
        if (fold(slice) !== candidate.folded) continue
        if (WORD_CHAR.test(text.charAt(end))) continue
        if (!caseHolds(slice, candidate.term)) continue
        if (candidate.term.needs_context && !hasContext(text, token.index, end, dollar && !glued)) {
          continue
        }
        matched = {
          start: dollar && !glued ? token.index : wordStart,
          end,
          ticker: candidate.term.ticker,
          term: candidate.term,
        }
        break
      }
      if (matched) break
    }

    if (matched) {
      found.push(matched)
      TOKEN.lastIndex = matched.end
    }
  }
  return found
}
