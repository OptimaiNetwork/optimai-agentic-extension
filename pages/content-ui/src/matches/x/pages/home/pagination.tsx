import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Numbered pages, because one venue is far larger than one page.
 *
 * bStocks has 77 tokens and fits in a single page of 100, which is why nobody
 * noticed that `page` was accepted by the server and then ignored. Ondo has
 * 442: the panel was showing the first hundred and offering no way to reach
 * the other 342.
 *
 * Numbers rather than a "load more" button: the list is ranked by market cap
 * and a reader who wants the small end should not have to summon four pages to
 * get there.
 */

/** Neighbours of the current page shown before the run collapses into an ellipsis. */
const NEIGHBOURS = 1

const GAP = '…' as const

/**
 * `1 … 4 5 6 … 45`, always the same width give or take a digit.
 *
 * The first and last page are always present because they are the two a person
 * asks for by name; everything between them is relative to where they are.
 */
const pagesFor = (current: number, count: number): (number | typeof GAP)[] => {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1)

  const middle = Array.from(
    { length: NEIGHBOURS * 2 + 1 },
    (_, index) => current - NEIGHBOURS + index
  ).filter((page) => page > 1 && page < count)

  return [
    1,
    ...(middle[0] !== undefined && middle[0] > 2 ? [GAP] : []),
    ...middle,
    ...(middle.at(-1) !== undefined && middle.at(-1)! < count - 1 ? [GAP] : []),
    count,
  ]
}

const Step = ({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="text-muted-foreground hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30">
    {children}
  </button>
)

export const Pagination = ({
  page,
  pageCount,
  onPage,
}: {
  page: number
  pageCount: number
  onPage: (next: number) => void
}) => {
  if (pageCount <= 1) return null

  return (
    <nav aria-label="Pages" className="text-11 flex items-center justify-center gap-1 px-3 py-3">
      <Step label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="size-3.5" />
      </Step>

      {pagesFor(page, pageCount).map((entry, index) =>
        entry === GAP ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="text-muted-foreground flex size-6 items-center justify-center">
            {GAP}
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-current={entry === page ? 'page' : undefined}
            onClick={() => onPage(entry)}
            className={`flex size-6 shrink-0 items-center justify-center rounded-md tabular-nums transition-colors ${
              entry === page
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
            }`}>
            {entry}
          </button>
        )
      )}

      <Step label="Next page" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        <ChevronRight className="size-3.5" />
      </Step>
    </nav>
  )
}
