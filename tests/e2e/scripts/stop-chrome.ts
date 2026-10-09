import { stopChrome } from '../src/chrome.js'

const pid = stopChrome()
console.log(
  pid === null ? 'No Chrome recorded as started by the e2e tooling.' : `Stopped pid ${pid}`
)
