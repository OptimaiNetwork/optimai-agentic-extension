import { cn } from '@extension/ui'
import { OPTIMAI_MARK_PATHS, OPTIMAI_MARK_RING } from '@x/layouts/global-layout/brand'
import { usePanelOpen } from '@x/layouts/global-layout/panel-open'
import { useSelectedChain } from '@x/modules/venue'
import type { AssetContext } from '@x/services/agent'
import { CHAINS } from '@extension/shared'
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'

import type { AgentSuggestion } from '../suggestions'
import { EASE_IN_OUT, EASE_OUT, SPRING_SWAP } from './ease'
import { RotatingText } from './rotating-text'

/**
 * What the agent shows before there is anything to show.
 *
 * Its own file because the page had grown three screens long, and because the
 * motion here is choreographed rather than a class on each element: a ring that
 * draws, then the mark inside it, then the line, then the chips — one sequence
 * with one set of timings, which is impossible to keep straight when it is
 * spread across a page's JSX.
 *
 * Everything collapses to a plain fade under `prefers-reduced-motion`. The
 * ring's draw is the largest movement on the screen and the first thing that
 * has to go.
 */

/**
 * The heading, cycling.
 *
 * A good empty state asks "What should I do on X?", and that is the bar: one
 * sentence in which an agent asks the reader for work, naming the place it
 * works. This agent's place is two places — it reads X posts and it reads BNB
 * Chain, and its whole job is saying whether the two agree — so the sentences
 * name X, the chain, the reserve, the filings and the market.
 *
 * Three constraints, and every earlier set dropped one. `look into?` /
 * `check for you?` / `verify?` ran 7 to 14 characters, so the line grew and
 * shrank on each swap. `What's moving today?` was even but had the agent musing
 * about the market instead of asking anybody anything. `Want me to check the
 * gap?` asked, but named no place — it could have been any finance tool.
 *
 * These are **exactly 17 characters each**, and each is a tool it has:
 *
 *   check on X first?  `search_x`, `analyze_x_posts`
 *   look up on chain?  `get_prices` — the token's price, on every venue
 *   read the reserve?  `get_backing` — the backing and share multiplier
 *   read in a filing?  `get_company_updates`, `check_claim`
 *   watch the market?  `get_market_status`
 *
 * None of them offers a verdict on whether to buy. That is settled and not up
 * for rediscussion, and an empty state is exactly where a product drifts into
 * promising it.
 */
const PREFIX = 'What should I'

const TAILS = [
  'check on X first?',
  'look up on chain?',
  'read the reserve?',
  'read in a filing?',
  'watch the market?',
]

/** Long enough for the ring to read as drawn, short enough not to be a wait. */
const RING_DRAW_MS = 780

/**
 * The ring draws on `EASE_IN_OUT`, not the `EASE_OUT` everything else uses.
 *
 * `EASE_OUT` is `cubic-bezier(0.16, 1, 0.3, 1)`, which spends ~95% of its
 * distance in the first fifth of its duration — measured on the live panel, the
 * dash array went 0 → 1 inside 180ms of a 900ms animation. That is right for
 * something arriving and wrong for something being drawn: the line jumped round
 * the circle and then sat still. A travelling line needs a curve that travels.
 */

type EmptyStateProps = {
  asset?: AssetContext
  suggestions: AgentSuggestion[]
  onPick: (suggestion: AgentSuggestion) => void
}

export const AgentEmptyState = ({ asset, suggestions, onPick }: EmptyStateProps) => {
  const reduce = useReducedMotion() ?? false
  const chainLabel = CHAINS[useSelectedChain()].label

  /**
   * The entrance is keyed to the panel being visible, not to this mounting.
   *
   * The panel is never unmounted — it slides out and its route goes on living,
   * which `panel-open.ts` exists to say. So the whole sequence used to play
   * while the panel was off-screen: measured on the live harness, the ring's
   * dash array was still sitting at `0.0048px` long after the animation should
   * have finished, because it ran and stalled behind a closed panel. Gating on
   * `open` also means it replays each time the panel is summoned, which is when
   * there is somebody to watch it.
   */
  const open = usePanelOpen()
  const shown = open ? 'shown' : 'hidden'

  const group = {
    hidden: {},
    shown: {
      transition: {
        // The mark owns the first beat; the text follows it rather than racing.
        delayChildren: reduce ? 0 : RING_DRAW_MS / 1000 / 2,
        staggerChildren: reduce ? 0 : 0.055,
      },
    },
  }

  const rise = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 10 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
  }

  const pop = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.94 },
    shown: { opacity: 1, y: 0, scale: 1, transition: SPRING_SWAP },
  }

  return (
    <div className="flex flex-col items-center px-5 text-center">
      <div className="relative flex items-center justify-center">
        <motion.svg
          viewBox="0 0 266 266"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          className="text-foreground/90 relative size-10">
          <motion.circle
            {...OPTIMAI_MARK_RING}
            stroke="currentColor"
            strokeLinecap="round"
            initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 0 : 1 }}
            animate={{ pathLength: open ? 1 : 0, opacity: open ? 1 : reduce ? 0 : 1 }}
            transition={{ duration: reduce ? 0.3 : RING_DRAW_MS / 1000, ease: EASE_IN_OUT }}
          />
          {OPTIMAI_MARK_PATHS.map((d, index) => (
            <motion.path
              key={d.slice(0, 16)}
              d={d}
              fill="currentColor"
              initial={{ opacity: 0 }}
              animate={{ opacity: open ? 1 : 0 }}
              transition={{
                // Behind the ring, not with it: the strokes appear as the line
                // closing around them finishes.
                delay: reduce ? 0 : RING_DRAW_MS / 1000 / 2 + index * 0.08,
                duration: reduce ? 0.3 : 0.5,
                ease: EASE_OUT,
              }}
            />
          ))}
        </motion.svg>
      </div>

      <motion.div variants={group} initial="hidden" animate={shown} className="w-full">
        <LayoutGroup>
          <motion.h2
            className="text-20 mt-4 flex items-center justify-center gap-1 overflow-hidden"
            layout>
            <motion.span layout transition={{ type: 'spring', damping: 30, stiffness: 400 }}>
              {PREFIX}{' '}
            </motion.span>
            <RotatingText
              texts={TAILS}
              auto={open && !reduce}
              loop={true}
              initial={reduce ? { opacity: 0 } : { y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { y: '-120%', opacity: 0 }}
              transition={
                reduce ? { duration: 0.2 } : { type: 'spring', damping: 30, stiffness: 400 }
              }
              splitBy="characters"
              staggerFrom="last"
            />
          </motion.h2>
        </LayoutGroup>
        <motion.h2
          variants={rise}
          className="text-20 text-foreground mt-5 font-semibold leading-tight tracking-tight">
          {/* The stable sentence, for anything reading rather than watching.
              The visible tail rotates; a screen reader gets one heading. */}

          {/* `RotatingText` carries its own `sr-only` copy of the current
              phrase and marks the animated one `aria-hidden`, so the heading
              reads as one sentence without a second copy here.

              `auto` is the pause: the panel is never unmounted, so an interval
              left running would tick behind a panel nobody can see — the thing
              `panel-open.ts` exists to say — and a reader who asked for less
              motion should get a heading that holds still. */}
        </motion.h2>

        {/* Only with nothing else to go on. With a token loaded the six chips
            below already say what to ask, and a line of prose above them is one
            more thing to read before the first click. */}
        {!asset?.ticker && (
          <motion.div variants={rise} className="mt-2.5 flex justify-center">
            {/* Same voice as the heading: the agent offering, not the panel
                instructing. */}
            <p className="text-13 text-faint max-w-[260px] leading-relaxed">
              Name a company, a headline, or a token on {chainLabel} and I&rsquo;ll go look.
            </p>
          </motion.div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
            {suggestions.map((suggestion) => {
              const Icon = suggestion.icon
              return (
                <motion.button
                  key={suggestion.label}
                  type="button"
                  variants={pop}
                  onClick={() => onPick(suggestion)}
                  title={suggestion.prompt}
                  whileHover={reduce ? undefined : { y: -1 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  className={cn(
                    'text-12 flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-medium leading-none',
                    'border-border-soft text-faint transition-colors duration-150',
                    'hover:border-border-strong hover:bg-surface hover:text-foreground'
                  )}>
                  <Icon className="text-faint/70 size-3.5" />
                  {suggestion.label}
                </motion.button>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
