import { CHAINS, CHAIN_IDS, VENUES, VENUE_LISTINGS } from '@extension/shared'
import type { ChainId, VenueId } from '@extension/shared'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { getSelection, setChain, setSelection, useSelection } from '@/matches/x/modules/venue'
import { VenueMark } from '@/matches/x/modules/venue/marks'
import { NamespaceMark } from '@/matches/x/modules/wallet/marks'
import { PATHS } from '@/matches/x/routers/paths'
import { useDismiss } from './use-dismiss'

interface SelectorOption<T extends string> {
  value: T
  label: string
  icon: ReactNode
}

/** A pill with a listbox under it; the web trade panel's chain switch reuses it. */
export const Selector = <T extends string>({
  ariaLabel,
  value,
  label,
  options,
  onSelect,
  align = 'right',
}: {
  ariaLabel: string
  value: T
  label: string
  options: SelectorOption<T>[]
  onSelect: (value: T) => void
  align?: 'left' | 'right'
}) => {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useDismiss(
    open,
    container,
    useCallback(() => setOpen(false), [])
  )

  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus()
  }, [open])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      trigger.current?.focus()
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const options = menu.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')
    if (!options?.length) return
    event.preventDefault()
    const activeIndex = Array.from(options).indexOf(document.activeElement as HTMLButtonElement)
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : event.key === 'ArrowDown'
            ? (activeIndex + 1 + options.length) % options.length
            : (activeIndex - 1 + options.length) % options.length
    options[nextIndex]?.focus()
  }

  return (
    <div ref={container} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${ariaLabel}: ${label}`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className="text-11 text-foreground flex items-center gap-1.5 rounded-full border border-white/10 py-1 pl-1 pr-2 transition-colors hover:bg-white/5">
        {options.find((option) => option.value === value)?.icon}
        <span className="max-w-[76px] truncate">{label}</span>
        <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={listId}
          ref={menu}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          onKeyDown={handleKeyDown}
          className={`rounded-10 bg-brown absolute top-full z-50 mt-1 min-w-[156px] border border-white/10 py-1 shadow-2xl ${align === 'left' ? 'left-0' : 'right-0'}`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                setOpen(false)
                onSelect(option.value)
              }}
              className={`text-11 flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-white/5 ${value === option.value ? 'text-foreground' : 'text-muted-foreground'}`}>
              {option.icon}
              {option.label}
              {value === option.value && <span className="text-primary ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const ChainSwitcher = () => {
  const selection = useSelection()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const choose = (chain: ChainId) => {
    if (chain === getSelection().chain) return
    setChain(chain)
    queryClient.clear()
    navigate(PATHS.HOME)
  }

  return (
    <Selector
      ariaLabel="Chain"
      value={selection.chain}
      label={CHAINS[selection.chain].label}
      align="left"
      options={CHAIN_IDS.map((chain) => ({
        value: chain,
        label: CHAINS[chain].label,
        icon: <NamespaceMark namespace={chain === 'solana' ? 'svm' : 'evm'} className="size-4" />,
      }))}
      onSelect={choose}
    />
  )
}

export const VenueSwitcher = () => {
  const selection = useSelection()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const choose = (venue: VenueId) => {
    const current = getSelection()
    if (venue === current.venue) return
    setSelection(venue, current.chain)
    queryClient.clear()
    navigate(PATHS.HOME)
  }

  return (
    <Selector
      ariaLabel="Issuer"
      value={selection.venue}
      label={VENUES[selection.venue].label}
      options={VENUE_LISTINGS[selection.chain].map((venue) => ({
        value: venue,
        label: VENUES[venue].label,
        icon: <VenueMark venue={venue} />,
      }))}
      onSelect={choose}
    />
  )
}
