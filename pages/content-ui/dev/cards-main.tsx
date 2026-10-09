/**
 * Every research card, rendered by the real components from fixtures that carry
 * the design canvas's sample figures. Each frame is an artboard's twin: 500px
 * wide, 24px in, on the panel's #212121, so a frame can be screenshotted and
 * laid beside its artboard. `?card=<Id>` shows one frame alone.
 *
 * Mounted the way `main.tsx` mounts the panel (open shadow root, the panel's
 * own stylesheet adopted) so what renders here is what renders on x.com.
 */
import './chrome-shim'

import { ShadowRootProvider } from '@extension/ui'
import { loadSelection } from '@x/modules/venue'
import { FlowRenderer } from '@x/pages/agent/components/flow-renderer'
import { ResearchCardRenderer } from '@x/pages/agent/components/research-card-renderer'
import QueryProvider from '@x/providers/query'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

import panelCss from '@x/index.css?inline'
import { GALLERY } from './card-fixtures'

const only = new URLSearchParams(location.search).get('card')
const frames = GALLERY.filter((frame) => !only || frame.id === only)

const Gallery = () => (
  <div
    style={{ display: 'flex', flexWrap: 'wrap', gap: 40, padding: 40, alignItems: 'flex-start' }}>
    {frames.map((frame) => (
      <section key={frame.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ font: '600 12px system-ui', color: '#8f8f8f' }}>{frame.title}</span>
        <div
          id={`frame-${frame.id}`}
          style={{
            width: 500,
            boxSizing: 'border-box',
            padding: 24,
            background: '#212121',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
          <div style={{ width: 452 }}>
            {frame.card && <ResearchCardRenderer card={frame.card} />}
            {frame.flow && <FlowRenderer spec={frame.flow} />}
          </div>
        </div>
      </section>
    ))}
  </div>
)

const host = document.createElement('div')
host.id = 'catalyst-extension-root'
document.body.append(host)
const shadow = host.attachShadow({ mode: 'open' })
const sheet = new CSSStyleSheet()
sheet.replaceSync(panelCss)
shadow.adoptedStyleSheets = [sheet]
const mount = document.createElement('div')
mount.id = 'catalyst-shadow-root'
shadow.appendChild(mount)

void loadSelection().then(() =>
  createRoot(mount).render(
    <ShadowRootProvider container={mount}>
      <QueryProvider>
        <MemoryRouter>
          <Gallery />
          {/* Where the panel's tooltips portal to, as `GlobalLayout` provides it
              on x.com. Zero-sized: the panel's own styles give this id a border
              and a backdrop blur, which must not land on the gallery. */}
          <div
            id="catalyst-extension-container"
            style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0 }}
          />
        </MemoryRouter>
      </QueryProvider>
    </ShadowRootProvider>
  )
)
