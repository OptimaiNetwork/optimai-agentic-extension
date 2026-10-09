/**
 * The panel, on a page that is not x.com and not a content script.
 *
 * This file mirrors `src/matches/x/index.tsx` deliberately and closely: same
 * host element id, same open shadow root, same adopted stylesheet, same
 * `#catalyst-shadow-root` with the same inline styles, same `loadSelection()`
 * before the first render. Where it differs from the real entry point, the panel
 * is being designed against a lie — so if that file changes, change this one.
 *
 * What it adds is only ever *around* the panel: a stand-in for X behind it, and
 * a toolbar to drive it. `AppRouter` is imported unmodified.
 */

// First, and on its own line: importing this installs `chrome`, and ES modules
// evaluate imports in order, so everything below it already has a platform.
import './chrome-shim'

import { ShadowRootProvider } from '@extension/ui'
import { loadSelection } from '@x/modules/venue'
import AppRouter from '@x/routers'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'

import panelCss from '@x/index.css?inline'
import globalOverrides from '@x/styles/index.css?inline'
import { Backdrop } from './backdrop'
import { Toolbar } from './toolbar'
import './backdrop.css'
import './toolbar.css'

/** The light-DOM overrides the content script injects into `document.head`. */
const injectGlobalStyles = (css: string, id: string) => {
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.innerHTML = css
  document.head.appendChild(style)
}

/* --------------------------------------------------------------- the page --- */

const Page = () => {
  const [backdrop, setBackdrop] = useState(true)
  return (
    <>
      {backdrop && <Backdrop />}
      <Toolbar backdrop={backdrop} onBackdrop={setBackdrop} />
    </>
  )
}

const page = document.createElement('div')
page.id = 'catalyst-dev-page'
document.body.append(page)
createRoot(page).render(<Page />)

/* -------------------------------------------------------------- the panel --- */

const root = document.createElement('div')
root.id = 'catalyst-extension-root'
document.body.append(root)

injectGlobalStyles(globalOverrides, 'catalyst-global-styles')

const rootIntoShadow = document.createElement('div')
rootIntoShadow.id = 'catalyst-shadow-root'
rootIntoShadow.style.pointerEvents = 'none'
rootIntoShadow.style.position = 'fixed'
rootIntoShadow.style.inset = '0'
rootIntoShadow.style.zIndex = '9999'
rootIntoShadow.style.overflow = 'hidden'

const shadowRoot = root.attachShadow({ mode: 'open' })
const sheet = new CSSStyleSheet()
sheet.replaceSync(panelCss)
shadowRoot.adoptedStyleSheets = [sheet]
shadowRoot.appendChild(rootIntoShadow)

const App = () => (
  <ShadowRootProvider container={rootIntoShadow}>
    <AppRouter />
  </ShadowRootProvider>
)

void loadSelection().then(() => createRoot(rootIntoShadow).render(<App />))
