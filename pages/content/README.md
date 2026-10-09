# Content Script

Plain content scripts without a UI. Each folder under `src/matches/` becomes one
IIFE bundle, `dist/content/<folder>.iife.js`.

https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

## Folders

- `src/matches/x-network/` runs in the page's MAIN world at `document_start` and
  hooks `XMLHttpRequest` so the extension can read the responses X already loads.
- `src/matches/svm-wallet/` runs in the MAIN world and exposes the page's Solana
  Wallet Standard wallet (for example MetaMask) to the trade panel.

### Add New Script

1. Create `src/matches/{new_folder}/` with an `index.ts` entry. A folder without
   an index file is skipped.
2. Register it in `chrome-extension/manifest.ts`, in the `content_scripts`
   section:

```ts
{
  matches: ['URL_FOR_INJECT'],
  js: ['content/{new_folder}.iife.js']
}
```
