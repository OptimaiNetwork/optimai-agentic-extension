import { createElement, useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SidebarButton } from './sidebar-button'

interface UseSidebarInjectionProps {
  /** Show or hide the panel. The button is a second way in, beside a tweet. */
  onToggle: () => void
}

export const useSidebarInjection = ({ onToggle }: UseSidebarInjectionProps) => {
  const observerRef = useRef<MutationObserver | null>(null)
  const rootRef = useRef<Root | null>(null)
  const onToggleRef = useRef(onToggle)
  const isInitializedRef = useRef(false)
  onToggleRef.current = onToggle

  // Set up mutation observer and initial injection
  useEffect(() => {
    const injectButton = () => {
      const moreButton = document.querySelector('[data-testid="AppTabBar_More_Menu"]')
      if (!moreButton) return

      const rootId = 'catalyst-sidebar-actions'
      let existingRoot = document.getElementById(rootId)

      // Check if button needs to be re-injected
      if (!existingRoot || !existingRoot.parentNode) {
        // Clean up existing root if it exists but is detached
        if (existingRoot) {
          existingRoot.remove()
        }

        // Create new root element
        existingRoot = document.createElement('div')
        existingRoot.id = rootId

        // Create a fresh React root for this injection
        rootRef.current = createRoot(existingRoot)

        // Render the button
        moreButton.parentNode?.insertBefore(existingRoot, moreButton.nextSibling)
      }

      // This root lives outside the panel's tree. Keep the event handler
      // stable and read the current callback through a ref; otherwise the first
      // click opens the panel, but the injected button keeps the old "closed"
      // closure forever and can never cancel an active research run.
      rootRef.current?.render(
        createElement(SidebarButton, { onClick: () => onToggleRef.current() })
      )
    }

    // Set up MutationObserver (only once)
    if (!observerRef.current) {
      observerRef.current = new MutationObserver(() => {
        // Check if our button was removed or if sidebar structure changed
        const buttonExists = document.getElementById('catalyst-sidebar-actions')
        const moreButton = document.querySelector('[data-testid="AppTabBar_More_Menu"]')

        if (moreButton && (!buttonExists || !buttonExists.parentNode)) {
          // Re-inject the button
          injectButton()
        }
      })
    }

    // Initial injection after delay
    const timeoutId = setTimeout(
      () => {
        isInitializedRef.current = true
        injectButton()

        // Start observing the sidebar area for changes
        const sidebar = document.body
        observerRef.current?.observe(sidebar, {
          childList: true,
          subtree: true,
        })
      },
      isInitializedRef.current ? 0 : 1500
    )

    // Cleanup
    return () => {
      clearTimeout(timeoutId)
    }
  }, [onToggle])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Disconnect observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      // Clean up the button element
      const rootElement = document.getElementById('catalyst-sidebar-actions')
      if (rootElement) {
        rootRef.current?.unmount()
        rootRef.current = null
        rootElement.remove()
      }
    }
  }, [])
}
