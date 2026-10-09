import { useEffect, type RefObject } from 'react'

/**
 * Close a popover on an outside click, from inside a shadow root.
 *
 * `event.target` is retargeted at the shadow boundary, so a listener on
 * `document` sees the host element for every click inside the panel and
 * `node.contains(target)` answers "outside" for clicks that were plainly
 * inside. `composedPath()` is the path before retargeting, which is the only
 * thing that can tell them apart.
 *
 * Capture phase, so a menu closes before whatever was clicked underneath acts
 * on it rather than after.
 */
export const useDismiss = (
  open: boolean,
  container: RefObject<HTMLElement | null>,
  close: () => void
): void => {
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      const node = container.current
      if (!node) return
      if (event.composedPath().includes(node)) return
      close()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('mousedown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, container, close])
}
