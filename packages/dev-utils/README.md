# Shared Package

This package contains code which could helps you to develop.
To use the code in the package, you need to add the following to the package.json file.

```json
{
  "devDependencies": {
    "@extension/dev-utils": "workspace:*"
  }
}
```

## Contents

- `lib/manifest-parser/` turns the manifest object into the JSON written to
  `dist/manifest.json`, with the Firefox-specific changes when building for it.
- `lib/stream-file-to-zip.ts` streams build output into the release zip.
