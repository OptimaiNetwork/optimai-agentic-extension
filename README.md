# OptimAI Agentic

A Chrome extension that corrects what X tells you about tokenized stocks, and
lets you act on the correction without leaving the page.

Built for **BNB Hack: Tokenized Stocks Edition**. Spot trades only.

---

## The problem, in one screenshot

Search `$NVDA` on X and you get NVIDIA Corp, NASDAQ, $222.27. Nothing on the page
says a tokenized NVDA trades on BNB Smart Chain, or that it kept trading after
that price froze.

Search `$TSLAx` and X shows contract `XsDoVf…HzoB`, a **Solana** mint. The BSC
token is `0x8ad3c73f…`, a different address entirely. Parse the contract off X's
card and you have the wrong chain.

This is structural, not a bug X will fix. Its cashtag stack is Solana-native:
feature flag `rweb_cashtags_enabled`, chart data from Birdeye, RPC from Helius,
actions from Dialect, and `contract_address` filled from a generic `asset.crypto`
field.

**A browser extension can correct the page. The page cannot correct itself.**

## What it does

**Chain and issuer.** The panel opens on **Solana with Ondo** tokens
(`DEFAULT_CHAIN` and `DEFAULT_VENUE` in `packages/shared/lib/constants/env.ts`).
A switcher in the panel changes the pair. The listings are:

| Chain | Issuers |
| --- | --- |
| Solana (default) | Ondo, PreStocks |
| BNB Chain | bStocks, Ondo |

The choice is remembered in `chrome.storage.local`. Switching to BNB Chain with
bStocks is the path the hackathon findings below were measured on.

**On a tweet.** A cashtag that names a listed ticker gets a button in the action
bar. It opens the panel on that ticker, with the price on the selected chain (the
multiplier already divided out), what the underlying share costs, and whether
the token can actually be bought.

**On a cashtag search page.** A card goes in below X's own, carrying a chart with
the hours the exchange was shut shaded in, and what the token did across them.
Measured on one such closure: from Friday's closing bell, NVDAB traded for 14
hours through a **2.17% range on 1.68 million of volume**. X's card draws that as
a flat line.

**On other sites.** A lighter content script finds tokenized stocks mentioned on
ordinary pages, puts a card behind each one and opens the same trade panel. It
stays off X, mail, document editors, sign-in pages and the trading venues
themselves.

**Ask the agent.** The panel has a chat with an agent. To
research a ticker it can ask the extension to open X's own search for a query
(Latest or Top) in the current tab and scroll it like a reader would, up to 28
scroll steps or 40 seconds per search. The extension never calls X's API itself:
it reads the responses the page loads anyway (see below) and hands the parsed
posts to the agent, which classifies them and writes the answer. Follow-up
questions are answered from the same posts and the live numbers.

**Where things are kept.**

| What | Where | Lifetime |
| --- | --- | --- |
| Chat transcript (up to 30 messages, about 2 MB, one per tab) | `chrome.storage.session` | until the browser closes |
| Chain and issuer choice | `chrome.storage.local` | until the extension is removed |
| Trades waiting to be recorded in the portfolio | `chrome.storage.local` | until recorded |

Nothing is kept in the page's own `localStorage`, which x.com's scripts can read.
There is no account and no sign-in.

**At the end.** A live quote, an unsigned transaction, and your own
wallet (MetaMask, for both the EVM and the Solana side). Nothing here is a
recommendation to buy or sell; the panel reports evidence and numbers and the
decision stays yours.

## Three things that are easy to get wrong

**One token is not one share.** Ondo and bStocks tokens reinvest dividends, so
the multiplier drifts above 1. Measured live: `AGGon` has a multiplier of
1.038181, and comparing its raw token price to the share price shows a **+3.818%
gap**. Divide first and it is **−0.000%**. The gap is arithmetic. It affects 255
of the 667 tokenized stocks on BSC.

**Only one issuer has a market on BSC.** Probing PancakeSwap V2, V3 and the
Infinity vault: NVDAB carries **$1.42M** of depth, TSLAB $482K, SPYB $351K, while
AAPLx, TSLAx and NVDAx all measure **$0 to $10**. xStocks is deployed on BSC at
scale and cannot be bought there. Ondo has a price and almost no pool, because it
settles by RFQ off the AMM entirely.

**bStocks publishes no share price.** Verified null for AAPLB, MSFTB, GMEB and
DJTB. The comparison price is borrowed from the Ondo token of the same ticker,
and the panel names the source. Ten of the 77 bStocks have no counterpart
anywhere, and those simply show no gap rather than one computed against zero.

## Running it

You need Node 22.15.1 or newer (`.nvmrc`) and pnpm 10.11 (`packageManager` in
`package.json`; `corepack enable` picks it up).

```bash
pnpm install                     # also copies .example.env to .env if there is no .env
pnpm build                       # then load dist/ at chrome://extensions (Developer mode)
pnpm dev                         # watch build, for development
```

### Tests

```bash
pnpm -F @extension/content-ui test   # 411 unit tests in 37 files, no browser
pnpm -F chrome-extension test        # 2 unit tests for the background fetcher
pnpm type-check
pnpm lint
```

The end to end suite is different in kind. It drives a real, signed-in Chrome
on the **real x.com**, with no retries, and it
makes one live model call. It is 24 tests in 8 spec files. Read
`tests/e2e/README.md` before running it, because it touches a real X account.

```bash
pnpm build && pnpm -F @extension/e2e e2e
```

## How it is put together

```
pages/content/src/matches/x-network/    MAIN world, document_start: hooks XHR
pages/content/src/matches/svm-wallet/   MAIN world: the Solana wallet bridge
pages/content-ui/src/matches/x/         the panel, the tweet button, the search card
pages/content-ui/src/matches/web/       the card on every other site
chrome-extension/src/wallet/            MetaMask, from the background
chrome-extension/src/api/               the background fetcher for API calls
packages/shared/                        constants, message types, the agent card contract
```

The extension reads X's own network traffic rather than asking X for anything: a
MAIN-world content script at `document_start` hooks `XMLHttpRequest` before X's
bundle can take its own reference, and parses the responses the page was already
loading. When the agent searches, it drives X's own UI to make the page load
them. No request is made to X that the page would not have made.

The extension holds no API keys, and the wallet holds the only private key.

## Credits

Extension scaffolding from
[chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite)
(MIT). See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md),
which also covers the Ajv code embedded in the generated validators.
