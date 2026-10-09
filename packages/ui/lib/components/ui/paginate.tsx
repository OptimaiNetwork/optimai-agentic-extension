import { cn } from '../../utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ComponentPropsWithoutRef } from 'react'
import ReactPaginate from 'react-paginate'

interface PaginateProps extends ComponentPropsWithoutRef<typeof ReactPaginate> {}

const linkClassnames = cn(
  'flex items-center justify-center size-10 text-sm rounded-lg border border-white/15 bg-black/40 text-white/70 transition-all',
  'hover:border-primary/30 hover:bg-primary/10 hover:text-primary',
  'focus:outline-none focus:ring-2 focus:ring-primary/30'
)

const activeClassnames = cn('!border-primary/30 !bg-primary/20 !text-primary shadow-sm')

const disabledClassnames = cn('pointer-events-none opacity-40 cursor-not-allowed')

const Paginate = ({ className, pageCount, ...props }: PaginateProps) => {
  return (
    <ReactPaginate
      className={cn('flex w-full items-center justify-center gap-2', className)}
      previousLinkClassName={linkClassnames}
      nextLinkClassName={linkClassnames}
      pageLinkClassName={linkClassnames}
      activeLinkClassName={activeClassnames}
      disabledLinkClassName={disabledClassnames}
      pageCount={pageCount}
      previousLabel={<ChevronLeft className="size-5" />}
      nextLabel={<ChevronRight className="size-5" />}
      breakLinkClassName={linkClassnames}
      breakLabel="..."
      pageRangeDisplayed={3}
      marginPagesDisplayed={1}
      {...props}
    />
  )
}

export { Paginate }
