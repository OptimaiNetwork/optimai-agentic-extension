import { parsePart, type ParsedPart } from '@extension/shared'
import type { AssetContext, EvidenceHint } from '@x/services/agent'
import {
  getAgentConversationSnapshot,
  subscribeAgentConversation,
  updateAgentConversation,
  type AgentConversationState,
} from './index'

/**
 * What survives a document reload.
 *
 * `chrome.storage.session` rather than the page's own storage: this holds a
 * session capability, and anything in `sessionStorage` on x.com belongs to
 * x.com's scripts as much as to ours. It is also per-browser-session, which is
 * the right lifetime — a conversation is not something this product should keep
 * after the browser closes.
 *
 * The key is the tab's own, so two X tabs do not overwrite each other's chat.
 * Everything here is best-effort: storage can be unavailable, and a panel that
 * cannot checkpoint should still work.
 */

const VERSION = 2
const KEY_PREFIX = 'catalyst:agent:'
/**
 * Roughly what one tab may keep. `chrome.storage.session` is capped per
 * extension, and a transcript with forty post snapshots in it is not small —
 * a checkpoint that grows until the write fails takes the whole transcript
 * with it, so it is trimmed on the way out instead.
 */
const MAX_BYTES = 2 * 1024 * 1024
const MAX_MESSAGES = 30
const byteSize = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length

type Checkpoint = Pick<
  AgentConversationState,
  'conversationId' | 'capability' | 'messages' | 'draft' | 'assets' | 'runId' | 'evidence'
> & { version: number; savedAt: number }

let key: string | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null

const storage = (): chrome.storage.StorageArea | null => {
  try {
    return chrome.storage?.session ?? null
  } catch {
    return null
  }
}

const keyFor = async (): Promise<string> => {
  if (key) return key
  // One checkpoint per tab. `chrome.tabs` is not available to a content script,
  // so the tab identifies itself through the background instead.
  try {
    const response = (await chrome.runtime.sendMessage({ type: 'tab:id' })) as
      | { tabId?: number }
      | undefined
    key = `${KEY_PREFIX}${response?.tabId ?? 'unknown'}`
  } catch {
    key = `${KEY_PREFIX}unknown`
  }
  return key
}

const snapshot = (state: AgentConversationState): Checkpoint => ({
  version: VERSION,
  savedAt: Date.now(),
  conversationId: state.conversationId,
  capability: state.capability,
  // Bounded: a long conversation should not grow the checkpoint without limit.
  messages: state.messages.slice(-MAX_MESSAGES),
  draft: state.draft,
  assets: state.assets,
  runId: state.runId,
  evidence: state.evidence,
})

/**
 * Drop the oldest messages until the checkpoint fits.
 *
 * Oldest first, and never the newest: what somebody has just been reading is
 * the part they will notice missing. A single message too large to fit on its
 * own keeps its prose and loses its parts — a card is recoverable by asking
 * again, the answer text is not.
 */
const TRIM_NOTICE = 'Older visuals were omitted to fit saved history.'

const fitted = (checkpoint: Checkpoint): Checkpoint => {
  // Each message is measured once and the total is kept as a running sum.
  // Re-serialising the whole candidate on every iteration meant up to thirty
  // passes over a multi-megabyte object on each debounced write — and the write
  // is debounced off every state change, including typing in the composer.
  const overhead = byteSize({ ...checkpoint, messages: [] })
  const sizes = checkpoint.messages.map(byteSize)
  let total = overhead + sizes.reduce((sum, size) => sum + size, 0)

  let first = 0
  while (first < checkpoint.messages.length - 1 && total > MAX_BYTES) {
    total -= sizes[first]
    first += 1
  }
  const messages = checkpoint.messages.slice(first)

  if (total <= MAX_BYTES) return { ...checkpoint, messages }

  // Still too big with one message left: keep the prose, drop the parts. A card
  // can be had again by asking; the answer text cannot.
  return {
    ...checkpoint,
    messages: messages.map((message) => ({
      ...message,
      parts: undefined,
      // Deduplicated. This used to append unconditionally, and because a
      // restored checkpoint's limitations are loaded verbatim back into live
      // state, every over-budget write after a reload added another copy —
      // the same sentence stacking up under a message, with a duplicate React
      // key each time.
      limitations: (message.limitations ?? []).includes(TRIM_NOTICE)
        ? message.limitations
        : [...(message.limitations ?? []), TRIM_NOTICE],
    })),
  }
}

const write = async (): Promise<void> => {
  const area = storage()
  if (!area) return
  try {
    await area.set({ [await keyFor()]: fitted(snapshot(getAgentConversationSnapshot())) })
  } catch {
    // A checkpoint that cannot be written is not a reason to lose the panel.
  }
}

/**
 * Read a checkpoint written by this build or the one before it.
 *
 * A v1 checkpoint has text and no parts, which is exactly what the renderer
 * falls back to, so migrating it is a version bump and nothing else. A version
 * from the future is refused outright: guessing at a shape a later build wrote
 * is how a reload turns into a crash.
 *
 * Parts are re-validated rather than trusted. They were validated when they
 * arrived, but the build that validated them may not be the build reading them.
 */
const migrate = (stored: unknown): Checkpoint | null => {
  if (!stored || typeof stored !== 'object') return null
  const checkpoint = stored as Partial<Checkpoint> & { version?: number }
  if (checkpoint.version !== 1 && checkpoint.version !== VERSION) return null

  const messages = Array.isArray(checkpoint.messages)
    ? checkpoint.messages
        .filter(
          (message) =>
            message &&
            typeof message.id === 'string' &&
            typeof message.text === 'string' &&
            (message.role === 'assistant' || message.role === 'user')
        )
        .slice(-MAX_MESSAGES)
    : []
  // Every field is rebuilt, not spread. Spreading `...checkpoint` carried
  // `assets`, `evidence`, `capability` and `conversationId` straight out of
  // storage with nothing checked, and `assets` is indexed into unguarded while
  // rendering (`asset.ticker`) — so one null in that array threw during render
  // with no boundary above the page, and the whole panel went blank on reload.
  // A corrupt checkpoint may cost the transcript. It must not cost the panel.
  return {
    version: VERSION,
    // A timestamp that is not a finite number is not a timestamp. Zero reads
    // as "unknown age", which is what an unreadable one is.
    savedAt: Number.isFinite(checkpoint.savedAt) ? (checkpoint.savedAt as number) : 0,
    conversationId: isString(checkpoint.conversationId) ? checkpoint.conversationId : null,
    capability: isString(checkpoint.capability) ? checkpoint.capability : null,
    draft: isString(checkpoint.draft) ? checkpoint.draft : '',
    runId: isString(checkpoint.runId) ? checkpoint.runId : null,
    assets: asArray(checkpoint.assets).filter(isAsset),
    evidence: asArray(checkpoint.evidence).filter(isEvidenceHint),
    messages: messages.map((message) => ({
      ...message,
      status: message.status === 'pending' ? 'interrupted' : message.status,
      limitations: asArray(message.limitations).filter(isString),
      parts: Array.isArray(message.parts)
        ? message.parts.map(restorePart).filter((part): part is ParsedPart => part !== null)
        : undefined,
    })),
  }
}

const isString = (value: unknown): value is string => typeof value === 'string'
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/**
 * An asset chip the panel will index into while rendering.
 *
 * `ticker` is the one field the render path reads unguarded, so it is the one
 * field that has to be there.
 */
const isAsset = (value: unknown): value is AssetContext =>
  !!value && typeof value === 'object' && isString((value as AssetContext).ticker)

const isEvidenceHint = (value: unknown): value is EvidenceHint =>
  !!value &&
  typeof value === 'object' &&
  isString((value as EvidenceHint).evidence_id) &&
  isString((value as EvidenceHint).query)

/** A checkpoint is an input boundary, not permission to trust old parsed objects. */
const restorePart = (part: unknown, index: number): ParsedPart | null => {
  if (!part || typeof part !== 'object') return null
  const value = part as Record<string, unknown>
  const id = typeof value.id === 'string' ? value.id : `restored-${index}`

  // An already-unsupported part is passed through rather than re-parsed. Sending
  // it back through `parsePart` as `type: 'unsupported'` lost the *original*
  // type, and the bubble only shows its "unavailable" notice for a part that
  // still says `data-visualization` or `data-research-card` — so the placeholder
  // silently disappeared on every reload and nothing took its place.
  if (value.kind === 'unsupported') {
    return typeof value.type === 'string' ? { kind: 'unsupported', id, type: value.type } : null
  }

  const types: Record<string, string> = {
    card: 'data-research-card',
    visualization: 'data-visualization',
    activity: 'data-activity',
    text: 'text',
  }
  const parsed = parsePart(
    {
      type: types[String(value.kind)] ?? 'unsupported',
      id,
      data: value.card ?? value.spec ?? value.activity,
      text: value.text,
    },
    index
  )
  if (parsed?.kind === 'activity') {
    return {
      ...parsed,
      activity: {
        ...parsed.activity,
        status: parsed.activity.status === 'running' ? 'cancelled' : parsed.activity.status,
        steps: parsed.activity.steps.map((step) =>
          step.status === 'running'
            ? { ...step, status: 'interrupted', finishedAt: new Date().toISOString() }
            : step
        ),
      },
    }
  }
  return parsed
}

/**
 * Restore the transcript, and say plainly that a run did not survive.
 *
 * A run that was mid-collection when the document reloaded is marked
 * interrupted, never resumed on its own: repeating a navigation the user did not
 * ask for again is worse than showing them a Retry.
 */
export const restoreCheckpoint = async (): Promise<void> => {
  const area = storage()
  if (!area) return
  try {
    const stored = await area.get(await keyFor())
    const checkpoint = migrate(stored?.[await keyFor()])
    if (!checkpoint) return
    updateAgentConversation({
      conversationId: checkpoint.conversationId,
      capability: checkpoint.capability,
      messages: checkpoint.messages ?? [],
      draft: checkpoint.draft ?? '',
      assets: checkpoint.assets ?? [],
      evidence: checkpoint.evidence ?? [],
      runId: null,
      runState: 'idle',
      recovery: checkpoint.runId ? 'interrupted' : 'none',
    })
  } catch {
    // Same: a checkpoint that cannot be read is a cold start, not an error.
  }
}

/**
 * Start saving on every change: debounced in general, immediate when a turn ends.
 *
 * The debounce exists for typing — a keystroke in the composer should not write
 * a two-megabyte transcript. But it also applied to the moment an answer
 * arrived, and a reload inside that 400ms window lost the whole answer: the
 * stored checkpoint was the one written when the question was sent, which still
 * carried the live `runId`, so the panel came back showing the question, no
 * answer, no cards, and "A search was interrupted when the page reloaded" for a
 * turn that had in fact finished.
 *
 * Found by a live end-to-end run, which is the only place a real answer and a
 * real reload meet. A turn reaching a terminal state is exactly the state worth
 * not losing, so it is written at once.
 */
const SETTLED: ReadonlySet<string> = new Set([
  'idle',
  'completed',
  'failed',
  'cancelled',
  'expired',
])

export const startCheckpointing = (): (() => void) => {
  let lastRunState: string | null = null

  const unsubscribe = subscribeAgentConversation(() => {
    const { runState } = getAgentConversationSnapshot()
    const settled = SETTLED.has(runState) && runState !== lastRunState
    lastRunState = runState

    if (settled) {
      // Two writes, and both are needed.
      //
      // The first captures the turn the moment it ends. The second runs after
      // the current synchronous batch, because `applyStatus` flips the run
      // state *before* patching the answer's text, sources and parts into the
      // message — so the first write alone stores a finished turn with no
      // answer in it.
      //
      // Neither goes through `writeTimer`. Routing them through it meant every
      // following notification cleared and rescheduled the pending write, and a
      // burst of them starved it entirely: the reload arrived with nothing
      // written since the question was sent.
      void write()
      setTimeout(() => void write(), 0)
    }

    if (writeTimer) clearTimeout(writeTimer)
    writeTimer = setTimeout(() => void write(), 400)
  })

  return () => {
    if (writeTimer) clearTimeout(writeTimer)
    writeTimer = null
    unsubscribe()
  }
}
