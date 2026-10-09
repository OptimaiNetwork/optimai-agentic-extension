import { ShadowRootProvider } from '@extension/ui'
import { loadSelection } from '@x/modules/venue'
import AppRouter from '@x/routers'
import { createRoot } from 'react-dom/client'
import inlineCss from '../../../dist/x/index.css?inline'
import globalOverrides from './styles/index.css?inline'

// Function to inject global styles into the document head
const injectGlobalStyles = (css: string, id: string) => {
  // Check if style already exists
  if (document.getElementById(id)) return

  const styleElement = document.createElement('style')
  styleElement.id = id
  styleElement.innerHTML = css
  document.head.appendChild(styleElement)
}

const root = document.createElement('div')
root.id = 'catalyst-extension-root'

document.body.append(root)

// Inject global styles to override page styles (outside Shadow DOM)
injectGlobalStyles(globalOverrides, 'catalyst-global-styles')

const rootIntoShadow = document.createElement('div')
rootIntoShadow.id = 'catalyst-shadow-root'
rootIntoShadow.style.pointerEvents = 'none'
rootIntoShadow.style.position = 'fixed'
rootIntoShadow.style.inset = '0'
rootIntoShadow.style.zIndex = '9999'
rootIntoShadow.style.overflow = 'hidden'

const shadowRoot = root.attachShadow({ mode: 'open' })

if (navigator.userAgent.includes('Firefox')) {
  const styleElement = document.createElement('style')
  styleElement.innerHTML = inlineCss
  shadowRoot.appendChild(styleElement)
} else {
  /** Inject styles into shadow dom */
  const globalStyleSheet = new CSSStyleSheet()
  globalStyleSheet.replaceSync(inlineCss)
  shadowRoot.adoptedStyleSheets = [globalStyleSheet]
}

shadowRoot.appendChild(rootIntoShadow)

const App = () => (
  <ShadowRootProvider container={rootIntoShadow}>
    <AppRouter />
  </ShadowRootProvider>
)

// The remembered chain before the first render, so a reload does not put
// somebody back on BNB Chain for one paint while they were reading Solana. The
// promise never rejects — a panel that cannot read storage opens on the default.
void loadSelection().then(() => createRoot(rootIntoShadow).render(<App />))
