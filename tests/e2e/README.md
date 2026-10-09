# @extension/e2e

Playwright tests that drive the built extension inside a real Google Chrome,
attached over CDP, against a persistent profile, on the real x.com and the live
OptimAI Agentic API. Nothing is stubbed except one local news article (`src/web-stub.ts`)
that the page-highlighting specs read.

## Run

```bash
# from the repo root: the tests load dist/
pnpm build
pnpm -F @extension/e2e e2e
```

The run refuses to start when the OptimAI Agentic API does not answer `/health`
(`src/global-setup.ts`).

Agent specs make real model calls. There is one live turn in the suite, a
market question, so it costs one model run.

Chrome starts on the first run and stays up afterwards, so later runs attach in
milliseconds. `pnpm e2e` from the repo root does the build and runs this suite
through turbo.

| Task | Command |
| --- | --- |
| Run the suite | `pnpm -F @extension/e2e e2e` |
| Open the Playwright UI | `pnpm -F @extension/e2e e2e:ui` |
| Start Chrome only (to log into X) | `pnpm -F @extension/e2e chrome` |
| Stop that Chrome | `pnpm -F @extension/e2e chrome:stop` |

## Logging into X

The profile at `.chrome-profile/` is a normal Chrome user-data-dir, so cookies,
`localStorage` and extension storage all persist. Run `pnpm -F @extension/e2e
chrome`, log into X by hand in the window that opens, and every later run
reuses that session. Deleting the folder resets to a signed-out browser.

The folder is gitignored. It holds a real session, so never commit it.

## The suite runs on the real x.com

Every spec reads the real site on the signed-in profile, so the suite is built
to look like one person reading, not like a crawler:

- **One shared tab.** `src/fixtures.ts` opens a single x.com tab per worker,
  loaded once on the `$NVDA` live search, and every spec reads from it. Only
  two more loads happen in a passing run: one reload (the agent transcript has
  to survive it) and one search for a cashtag no issuer lists. A failing spec
  restarts the worker, which costs one more load.
- **Throttled and counted.** `gotoX` in `src/live-x.ts` waits at least six
  seconds between loads and logs each one to `.x-run/x-loads.log`.
- **Stops when X pushes back.** A login wall, a rate limit, a challenge or an
  "unusual activity" page writes `.x-run/x-blocked.txt` and fails the spec;
  every later load refuses to start, in this run and in later ones. Check the
  account by hand in a normal browser, then delete that file.
- **Read only.** No spec posts, likes, follows, replies, changes a setting,
  connects a wallet or signs anything. Retries are off.

The profile has to be signed into X: run `pnpm -F @extension/e2e chrome`, log
in by hand, then run the suite.

## Why it is built this way

**Chrome no longer honours `--load-extension`.** From Chrome 137 the switch is
ignored outright; the browser starts, reports no error, and simply has no
extension. `--disable-features=DisableLoadExtensionCommandLineSwitch` does not
bring it back on Chrome 153. Unpacked extensions now go in through the CDP
`Extensions.loadUnpacked` command, which needs Chrome started with
`--enable-unsafe-extension-debugging`. That is what `src/extension.ts` does.

**A fixed CDP port is not safe to trust.** Any other CDP-enabled browser on the
machine (another Playwright run, an IDE's embedded browser) may already hold
the port. Attaching there looks like success right up until every extension
assertion fails. So Chrome's real endpoint is parsed from the
`DevTools listening on ws://…` line it prints on stderr, and cached in
`.chrome.endpoint`. Chrome does not write a `DevToolsActivePort` file into this
profile, so stderr is the only reliable source.

**The extension id is checked, not assumed.** Chrome derives an unpacked
extension's id from the absolute path of its folder: the first 128 bits of
SHA-256, each hex digit mapped `0-f` to `a-p`. `expectedExtensionId()` computes
it, and the suite asserts the id Chrome handed back matches, proof the tests are
driving the bundle that was just built.

**Workers are pinned to 1.** One Chrome, one user-data-dir. Parallel workers
would fight over the same profile lock.

## Layout

```
src/chrome.ts      launching Chrome, endpoint discovery, id derivation
src/extension.ts   installing the unpacked bundle over CDP
src/fixtures.ts    worker-scoped CDP connection, extension install, shared x.com tab
src/live-x.ts      throttled x.com loads, the stop on a login wall or rate limit
src/backend.ts     reading the live API to compare the panel against
src/global-setup.ts  refuses to run when the API is down
scripts/           launch / stop helpers
specs/             the tests
```

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `CHROME_PATH` | platform default | Chrome binary to launch |
| `CDP_PORT` | `9333` | port Chrome is asked for (the real one is read back); `0` lets Chrome pick a free one |
| `CEB_E2E_PROFILE` | `./.chrome-profile` | user-data-dir to persist into |
| `CEB_CATALYST_API_URL` | `https://agentic-api.optimai.network` | API the suite checks, and the build calls |
