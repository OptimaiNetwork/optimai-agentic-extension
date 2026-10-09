import { USER_REJECTED } from './chain'

export interface NormalizedWalletError {
  message: string
  code?: number
}

type ErrorRecord = Record<string, unknown>

const MESSAGE_KEYS = ['message', 'reason', 'details'] as const
const NESTED_ERROR_KEYS = ['error', 'data', 'originalError', 'cause'] as const
const MAX_MESSAGE_LENGTH = 280

const isRecord = (value: unknown): value is ErrorRecord =>
  typeof value === 'object' && value !== null

const textOf = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text && text !== '[object Object]' ? text : undefined
}

const codeOf = (value: unknown, seen = new Set<object>()): number | undefined => {
  if (!isRecord(value) || seen.has(value)) return undefined
  seen.add(value)

  if (typeof value.code === 'number') return value.code

  for (const key of NESTED_ERROR_KEYS) {
    const nestedCode = codeOf(value[key], seen)
    if (nestedCode !== undefined) return nestedCode
  }

  return undefined
}

const messagesOf = (
  value: unknown,
  seen = new Set<object>(),
  messages: string[] = []
): string[] => {
  const direct = textOf(value)
  if (direct) {
    messages.push(direct)
    return messages
  }

  if (value instanceof Error) {
    const errorMessage = textOf(value.message)
    if (errorMessage) messages.push(errorMessage)
  }

  if (!isRecord(value) || seen.has(value)) return messages
  seen.add(value)

  for (const key of MESSAGE_KEYS) {
    const message = textOf(value[key])
    if (message) messages.push(message)
  }

  for (const key of NESTED_ERROR_KEYS) {
    messagesOf(value[key], seen, messages)
  }

  return messages
}

const isGenericProviderMessage = (message: string): boolean =>
  /^(internal json-rpc error\.?|execution reverted\.?|transaction failed\.?)$/i.test(message)

const serializedOf = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined

  try {
    const seen = new WeakSet<object>()
    const serialized = JSON.stringify(value, (_key, nested: unknown) => {
      if (!isRecord(nested)) return nested
      if (seen.has(nested)) return '[Circular]'
      seen.add(nested)
      return nested
    })
    if (!serialized || serialized === '{}') return undefined
    return serialized.length > MAX_MESSAGE_LENGTH
      ? `${serialized.slice(0, MAX_MESSAGE_LENGTH - 1)}…`
      : serialized
  } catch {
    return undefined
  }
}

/**
 * Provider errors cross an extension boundary as plain objects rather than
 * Error instances. Always extract their useful fields before they reach the
 * panel, otherwise String(error) becomes the unhelpful "[object Object]".
 */
export const normalizeWalletError = (error: unknown): NormalizedWalletError => {
  const code = codeOf(error)

  if (code === USER_REJECTED) {
    return { message: 'You closed the wallet prompt', code }
  }

  const messages = messagesOf(error)
  const message = messages.find((candidate) => !isGenericProviderMessage(candidate)) ?? messages[0]

  return {
    message: message ?? serializedOf(error) ?? 'The wallet could not complete the request',
    code,
  }
}
