import {
  Compass,
  GitCompareArrows,
  MessageCircle,
  Newspaper,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Questions offered on an empty conversation, when a token came in with it.
 *
 * Templates, not a model call: nothing should cost a request merely because a
 * panel appeared. They are also deliberately neutral — "what news matters" does
 * not assert that there is news, and none of them presumes a price gap exists
 * before anything has been looked up.
 *
 * `label` and `prompt` are separate because the full questions were too long to
 * read as a set: five of them wrapped to two lines each and filled the screen
 * the empty state was supposed to keep open. The chip names the topic; clicking
 * writes the whole question into the composer, where it can be read and edited
 * before anything is sent.
 *
 * The label carries the ticker, and now carries it alone: the pill that used to
 * name the loaded token above these is gone, so the row is the only place the
 * screen says which one it is holding.
 *
 * Every one is answerable by a tool the chat agent actually has — `get_prices`
 * and `get_candles`, `get_backing` for the backing, `search_x` and
 * `analyze_x_posts` for the posts, `get_prices` again for the fifth, since it
 * reads every venue in one call, and `analyze_trade` for the last. A suggestion
 * for something the agent cannot look up is a promise the panel makes and the
 * model has to break.
 */
export type AgentSuggestion = {
  /** What the chip says. Short, and it names the token. */
  label: string
  /** What lands in the composer. A whole question, unsent. */
  prompt: string
  icon: LucideIcon
}

export const suggestionsFor = (
  ticker: string,
  symbol?: string,
  companyName?: string
): AgentSuggestion[] => {
  const company = companyName ?? ticker
  const token = symbol ?? ticker

  return [
    {
      label: `${ticker} news`,
      prompt: `What recent news matters for ${company}?`,
      icon: Newspaper,
    },
    {
      // Without a symbol the token *is* the ticker, and "NVDA vs NVDA" names a
      // comparison that does not exist.
      label: symbol ? `${symbol} vs ${ticker}` : 'Price vs the share',
      prompt: `How does ${token}'s price compare with its reference stock price?`,
      icon: Scale,
    },
    {
      label: `${ticker} on X`,
      prompt: `What are people on X saying about ${company}?`,
      icon: MessageCircle,
    },
    {
      label: `${token} backing`,
      prompt: `Explain ${token}'s backing and share multiplier.`,
      icon: ShieldCheck,
    },
    {
      // The one question only this product can answer: the same company is
      // tokenized by several issuers, on several chains, at prices that do not
      // have to agree.
      label: `${ticker} elsewhere`,
      prompt: `Where else is ${ticker} tokenized, and do those prices agree?`,
      icon: GitCompareArrows,
    },
    {
      // Answered by `analyze_trade`: a report and a computed split, never a
      // trade. Worded as a question with two sides so it does not presume one.
      label: `Buy ${ticker} now?`,
      prompt: `Should I buy ${company} now, or wait?`,
      icon: Compass,
    },
  ]
}
