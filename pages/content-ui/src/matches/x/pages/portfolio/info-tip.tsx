import { Info } from 'lucide-react'

/**
 * A label's fine print behind an ⓘ, shown on hover or keyboard focus.
 *
 * Plain CSS rather than the Radix tooltip: it has to open inside the panel's
 * shadow root, and one sentence does not need a portal to get there.
 */
export const InfoTip = ({ label, children }: { label: string; children: string }) => (
  <span className="group/tip relative inline-flex">
    <button
      type="button"
      aria-label={`About ${label}`}
      className="text-faint hover:text-foreground focus-visible:text-foreground -m-1.5 flex size-6 items-center justify-center rounded-full transition-colors">
      <Info className="size-3" aria-hidden="true" />
    </button>
    <span
      role="tooltip"
      className="text-11 text-secondary-foreground pointer-events-none invisible absolute left-1/2 top-full z-20 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-[#1b1b1b] px-3 py-2 font-normal leading-snug opacity-0 shadow-lg transition-opacity group-focus-within/tip:visible group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:opacity-100">
      {children}
    </span>
  </span>
)
