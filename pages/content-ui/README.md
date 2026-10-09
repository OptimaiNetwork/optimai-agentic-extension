# Content UI Script

Injects React components into the pages the manifest names. Each folder under
`src/matches/` becomes one IIFE bundle, `dist/content-ui/<folder>.iife.js`, built
by `build.mts` (Vite for the script, the Tailwind CLI for its stylesheet).

## Folders

- `src/matches/x/` is the panel on x.com: the sidebar button, the tweet buttons,
  the search card and the slide-in panel (ticker list, agent chat, buy flow,
  portfolio). It mounts inside a shadow root.
- `src/matches/web/` is the lighter script for every other http(s) page: it finds
  tokenized-stock mentions, puts a card behind each one and opens the trade panel
  from the card.

`dev/` holds a standalone harness that runs the real panel on an ordinary page
with a stubbed `chrome` API.

### Add New Script

1. Create `src/matches/{new_folder}/` with an `index.tsx` (or `index.ts`) entry
   and, if it needs styles, an `index.css`. A folder without an index file is
   skipped.
2. Register it in `chrome-extension/manifest.ts`, in the `content_scripts`
   section:

```ts
{
  matches: ['URL_FOR_INJECT'],
  js: ['content-ui/{new_folder}.iife.js']
}
```
