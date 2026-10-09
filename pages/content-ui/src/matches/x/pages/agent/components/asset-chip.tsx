import { useResolveCashtag } from '@x/queries/catalyst/use-resolve'
import { useState } from 'react'

/**
 * The token the conversation is about, with its logo on the issuer and chain
 * the panel is set to. Same resolve query as the pills on X, so it is usually
 * already cached; until it answers, or when the image fails, the initial.
 */
export const AssetChip = ({ ticker }: { ticker: string }) => {
  const symbol = ticker.replace(/^\$/, '').toUpperCase()
  const logo = useResolveCashtag(symbol).data?.logo
  const [failedLogo, setFailedLogo] = useState<string | null>(null)
  const showLogo = Boolean(logo) && failedLogo !== logo
  return (
    <span className="bg-surface border-border-soft text-12 mr-1.5 flex h-6 items-center gap-1.5 rounded-full border pl-1 pr-2 font-semibold leading-4">
      {showLogo ? (
        <img
          src={logo ?? undefined}
          alt=""
          aria-hidden="true"
          decoding="async"
          onError={() => setFailedLogo(logo ?? null)}
          className="size-4 shrink-0 rounded-full bg-white/5 object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          className="bg-brand text-brand-foreground text-xxs flex size-4 shrink-0 items-center justify-center rounded-full font-bold">
          {symbol.slice(0, 1)}
        </span>
      )}
      {symbol}
    </span>
  )
}
