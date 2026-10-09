import { createContext, useContext } from 'react'

/**
 * Whether the panel is currently on screen.
 *
 * It exists because the panel is never unmounted. Its container's presence in
 * the DOM is what proves the content script injected, and sliding it out is
 * cheaper than tearing down the React tree on every close — but that means the
 * route inside it goes on living, and anything polling goes on polling, for a
 * panel nobody can see.
 */
const PanelOpenContext = createContext(true)

export const PanelOpenProvider = PanelOpenContext.Provider

export const usePanelOpen = () => useContext(PanelOpenContext)
