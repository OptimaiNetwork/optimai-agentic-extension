'use client'
// beui.dev/components/agents/prompt-input

import { Button, cn } from '@extension/ui'
import { ArrowUp, Plus } from 'lucide-react'

import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

export interface PromptModel {
  value: string
  label: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface PromptAction {
  value: string
  label: ReactNode
  description?: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface PromptInputProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    'value' | 'defaultValue' | 'onChange' | 'onSubmit' | 'children'
  > {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  models?: PromptModel[]
  model?: string
  defaultModel?: string
  onModelChange?: (model: string) => void
  actions?: PromptAction[]
  onAction?: (action: string) => void
  onSubmit?: (value: string, model?: string) => void | Promise<void>
  loading?: boolean
  minRows?: number
  maxRows?: number
  leadingAction?: ReactNode
  className?: string
}

export function PromptInput({
  value,
  defaultValue = '',
  onValueChange,
  models = [],
  model,
  defaultModel,
  onModelChange,
  actions = [],
  onAction,
  onSubmit,
  loading = false,
  minRows = 2,
  maxRows = 8,
  leadingAction,
  className,
  disabled,
  placeholder = 'Ask the agent to do something…',
  'aria-label': ariaLabel = 'Prompt',
  onKeyDown,
  ...textareaProps
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const measurementRef = useRef<HTMLDivElement>(null)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [internalModel, setInternalModel] = useState(defaultModel ?? models[0]?.value)
  const [actionsOpen, setActionsOpen] = useState(false)
  const currentValue = value ?? internalValue
  const currentModelValue = model ?? internalModel
  const currentModel = models.find((option) => option.value === currentModelValue)
  const canSubmit = Boolean(currentValue.trim()) && !disabled && !loading

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    const measurement = measurementRef.current
    if (!textarea || !measurement || textarea.value !== currentValue) return

    const style = getComputedStyle(textarea)
    const lineHeight = Number.parseFloat(style.lineHeight)
    const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)
    const nextHeight = Math.min(
      Math.max(measurement.scrollHeight, minRows * lineHeight + padding),
      maxRows * lineHeight + padding
    )
    const height = `${nextHeight}px`
    if (textarea.style.height !== height) textarea.style.height = height
  }, [currentValue, maxRows, minRows])

  useLayoutEffect(() => {
    resizeTextarea()
  }, [resizeTextarea])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(resizeTextarea)
    observer.observe(textarea)
    return () => observer.disconnect()
  }, [resizeTextarea])

  const setValue = (next: string) => {
    if (value === undefined) setInternalValue(next)
    onValueChange?.(next)
  }

  const setModel = (next: string) => {
    if (model === undefined) setInternalModel(next)
    onModelChange?.(next)
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const prompt = currentValue.trim()
    if (!prompt || disabled || loading) return

    onSubmit?.(prompt, currentModelValue)
    if (value === undefined) setInternalValue('')
    textareaRef.current?.focus({ preventScroll: true })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event)
    if (
      event.defaultPrevented ||
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return
    }
    event.preventDefault()
    submit()
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        // Retargeted, not restyled. `rounded-4xl` is a Tailwind 4 radius this
        // repo does not define, so it emitted nothing and the box had square
        // corners. `bg-background` is the panel's own colour here rather than
        // the page behind it, and `border-border` sits *darker* than this
        // background at 1.02:1 — together the composer was invisible.
        // `surface`/`border-strong` keep the same contrast relationships on #212121 as the original dark design.
        'bg-surface border-border-strong relative w-full rounded-2xl border p-2',
        // The composer is the only thing on this screen you are meant to use,
        // and it was the quietest: `border-soft` at 80% is a 1.1:1 hairline,
        // and `focus-within:border-foreground/10` was *dimmer* than the resting
        // border, so focusing the box made its outline fade.
        'shadow-lg shadow-black/20 transition-all duration-150',
        'focus-within:border-brand/50 focus-within:ring-brand/15 ring-2 ring-transparent',
        disabled && 'opacity-60',
        className
      )}>
      <div
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-x-2 top-0 h-0 overflow-hidden">
        <div
          ref={measurementRef}
          className="text-14 whitespace-pre-wrap break-words px-2 pt-1.5 leading-6">
          {`${currentValue}\u200b`}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={currentValue}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={minRows}
        {...textareaProps}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        className="scrollbar-hide text-foreground placeholder:text-faint text-14 block w-full resize-none overflow-y-auto bg-transparent px-2 pt-1.5 leading-6 outline-none"
      />

      <div className="mt-1 flex min-h-8 items-center gap-1">
        {leadingAction}
        {/* While a turn runs the button simply waits: same arrow, disabled.
            Swapping it for a stop square or a spinner made the control jump
            between three states, and stopping a run is not something the
            composer should offer. */}
        <Button
          type="submit"
          icon
          size="sm"
          disabled={!canSubmit}
          aria-label={loading ? 'Sending' : 'Send prompt'}
          className="ml-auto size-8 rounded-full">
          <ArrowUp className="size-4" />
        </Button>
      </div>
    </form>
  )
}
