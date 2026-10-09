# Fixtures

- `x/` holds X GraphQL response **shapes**, captured on 2026-09-19 from one
  logged-in session and then rewritten. The structure is what X returned; the
  posts, handles, ids, cursors and numbers are invented. The raw capture is not
  here and will not be: `SearchTimeline` alone was 484 KB of real people's
  posts. The timeline parser tests read `x/search-timeline.json`.
- Binance responses are recorded by the server itself with `FIXTURE_RECORD=1`
  and live in the
  [optimai-agentic-server](https://github.com/OptimaiNetwork/optimai-agentic-server)
  repository at `tests/fixtures/upstream/`. They are public market data with no
  personal information, so they are kept verbatim.
