import { Check, Copy, ExternalLink } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { isSafeHttpUrl } from '@extension/shared'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@extension/ui'

interface MarkdownContentProps {
  content: string
  className?: string
  streaming?: boolean
}

export function MarkdownContent({
  content,
  className,
  streaming = false,
}: MarkdownContentProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'markdown-content text-foreground w-full max-w-full overflow-hidden break-words text-sm leading-relaxed [word-break:break-word]',
        className
      )}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-foreground mb-2 mt-4 text-lg font-semibold tracking-tight first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-foreground mb-1.5 mt-3.5 text-base font-semibold tracking-tight first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-foreground mb-1 mt-3 text-sm font-semibold tracking-tight first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2.5 break-words leading-6 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="text-foreground font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="text-foreground/90 italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="marker:text-faint my-2.5 ml-4 list-disc space-y-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="marker:text-faint my-2.5 ml-4 list-decimal space-y-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="break-words pl-0.5 leading-6">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-brand/50 text-faint my-3 break-words border-l-2 pl-3.5 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border-soft my-4" />,
          table: ({ children }) => (
            <div className="border-border-soft my-3 w-full overflow-x-auto rounded-lg border">
              <table className="text-xxs w-full text-left">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-border-soft bg-secondary/50 text-foreground border-b font-medium">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody className="divide-border/50 divide-y">{children}</tbody>,
          tr: ({ children }) => (
            <tr className="hover:bg-secondary/20 transition-colors">{children}</tr>
          ),
          th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2">{children}</td>,
          a: ({ href, children }) => {
            // A desktop app would route x.com links back into its own window.
            // There is no such window here, since this panel is already inside
            // x.com, and the browser's own navigation is the right and only
            // behaviour.
            //
            // The href is checked instead. Markdown reaches this component from
            // a model, and `javascript:` in a link is script execution, so
            // anything that is not plainly http(s) is rendered as text rather
            // than sanitised into a link that might still run.
            // `[1](#cite-1)` is how `message-bubble.tsx` hands a citation
            // marker through markdown. A fragment rather than a custom scheme
            // because react-markdown strips any protocol it does not know. It
            // is drawn as a small numbered pill matching the sources list under
            // the answer, and never as a link.
            const cite = /^#cite-(\d+)$/.exec(href ?? '')
            if (cite) {
              return (
                <sup className="text-xxs bg-border-soft text-faint ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 align-[2px] font-semibold leading-none">
                  {cite[1]}
                </sup>
              )
            }
            const safe = isSafeHttpUrl(href) ? href : undefined
            if (!safe) return <span className="break-all">{children}</span>
            return (
              <a
                className="text-brand inline-flex cursor-pointer items-baseline gap-0.5 break-all font-medium hover:underline"
                href={safe}
                rel="noopener noreferrer"
                target="_blank">
                <span>{children}</span>
                <ExternalLink className="inline size-3 shrink-0 self-center opacity-70" />
              </a>
            )
          },
          pre({ children }) {
            const code = React.Children.toArray(children).find(
              React.isValidElement<{ children?: React.ReactNode; className?: string }>
            )
            const match = /language-([^\s]+)/.exec(code?.props.className ?? '')
            return (
              <CodeBlock
                code={String(code?.props.children ?? '').replace(/\n$/, '')}
                language={match?.[1]}
              />
            )
          },
          code({ children, className }) {
            return (
              <code
                className={cn(
                  'border-border-soft/40 bg-secondary/80 text-foreground break-words rounded-md border px-1.5 py-0.5 font-mono text-sm [word-break:break-word]',
                  className
                )}>
                {children}
              </code>
            )
          },
        }}
        remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      {streaming ? (
        <span className="bg-brand ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm align-middle" />
      ) : null}
    </div>
  )
}

function CodeBlock({ code, language }: { code: string; language?: string }): React.JSX.Element {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(copyTimer.current)
    }
  }, [])

  const handleCopy = async (): Promise<void> => {
    clearTimeout(copyTimer.current)
    try {
      await navigator.clipboard.writeText(code)
      if (mounted.current) setCopyState('copied')
    } catch {
      if (mounted.current) setCopyState('failed')
    }
    if (mounted.current) copyTimer.current = setTimeout(() => setCopyState('idle'), 2000)
  }

  return (
    <div className="border-border-soft bg-secondary/30 relative my-3 w-full overflow-hidden rounded-xl border">
      <div className="border-border-soft/60 bg-secondary/60 text-xxs text-faint flex items-center justify-between border-b px-3.5 py-1.5">
        <span className="text-xxs font-mono font-medium uppercase tracking-wide">
          {language ?? 'text'}
        </span>
        <button
          aria-label="Copy code"
          className="text-xxs text-faint hover:bg-secondary hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 font-medium transition-colors"
          type="button"
          onClick={handleCopy}>
          {copyState === 'copied' ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>{copyState === 'failed' ? 'Copy failed' : 'Copy'}</span>
            </>
          )}
        </button>
      </div>
      <pre className="text-xxs text-foreground/90 overflow-x-auto whitespace-pre-wrap break-words p-3.5 font-mono leading-relaxed [word-break:break-word]">
        <code>{code}</code>
      </pre>
    </div>
  )
}
