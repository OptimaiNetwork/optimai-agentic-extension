import { createContext, type ReactNode, useContext } from 'react'

type ShadowRootContextType = {
  shadowRootContainer: HTMLElement | null
}

const ShadowRootContext = createContext<ShadowRootContextType | null>(null)

const getDocument = () => (typeof document !== 'undefined' ? document : null)

const getFallbackShadowRootContainer = () => {
  const doc = getDocument()
  if (!doc) return null

  return doc.getElementById('catalyst-shadow-root') ?? null
}

export const useShadowRoot = (): ShadowRootContextType => {
  const context = useContext(ShadowRootContext)

  if (context?.shadowRootContainer) {
    return context
  }

  return { shadowRootContainer: getFallbackShadowRootContainer() }
}

export const useAppContainer = () => {
  const { shadowRootContainer } = useShadowRoot()
  const doc = getDocument()

  const host = shadowRootContainer ?? doc?.body ?? null
  return (
    host?.querySelector('#catalyst-extension-container') ??
    doc?.querySelector('#catalyst-extension-container') ??
    null
  )
}

type ShadowRootProviderProps = {
  children: ReactNode
  container: HTMLElement
}

export const ShadowRootProvider = ({ children, container }: ShadowRootProviderProps) => {
  return (
    <ShadowRootContext.Provider value={{ shadowRootContainer: container }}>
      {children}
    </ShadowRootContext.Provider>
  )
}
