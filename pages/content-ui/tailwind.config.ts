import { withUI } from '@extension/ui'

export default withUI({
  /**
   * `.ts` as well as `.tsx`.
   *
   * Tailwind emits a utility only when it finds the literal string in a scanned
   * file, and a class name can perfectly well live in a plain module — column
   * widths are declared once in `pages/home/sort.ts` and read by both the
   * heading and the row. While this glob was `.tsx` only, those widths were
   * generated purely by coincidence: the same literals also happened to be
   * hardcoded in the `.tsx`. Removing that duplication silently dropped the
   * widths from the stylesheet, and the columns collapsed onto their content.
   */
  content: ['src/**/*.{ts,tsx}'],
})
